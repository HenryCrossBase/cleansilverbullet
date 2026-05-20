#!/usr/bin/env node
/**
 * convert-final.cjs  – Third pass codemod
 *
 * Handles patterns the previous passes missed:
 *  1. Template literal with a single ternary span:
 *       `prefix${cond ? 'a' : 'b'}suffix`
 *     — evaluates the full prefix+value+suffix for each branch
 *  2. Nested (chained) ternaries where ALL leaf values are static:
 *       cond1 ? '#a' : cond2 ? '#b' : '#c'
 *
 * Run:  node scripts/convert-final.cjs
 */

"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

// ─── Filesystem ───────────────────────────────────────────────────────────────
function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(tsx|jsx)$/.test(e.name)) out.push(p);
    }
    return out;
}

function camelToKebab(s) {
    return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function esc(v) {
    return v.trim().replace(/\s+/g, "_");
}

// ─── Spacing scale ────────────────────────────────────────────────────────────
const REM_TO_TW = {
    0: "0",
    0.125: "0.5",
    0.25: "1",
    0.375: "1.5",
    0.5: "2",
    0.625: "2.5",
    0.75: "3",
    0.875: "3.5",
    1: "4",
    1.25: "5",
    1.5: "6",
    1.75: "7",
    2: "8",
    2.25: "9",
    2.5: "10",
    2.75: "11",
    3: "12",
    3.5: "14",
    4: "16",
    5: "20",
    6: "24",
    7: "28",
    8: "32",
    9: "36",
    10: "40",
    11: "44",
    12: "48",
    14: "56",
    16: "64",
    20: "80",
    24: "96",
};

function toTwScale(raw) {
    const v = String(raw).trim();
    if (v === "0" || v === "0px" || v === "0rem") return "0";
    if (v === "auto") return "auto";
    const remM = v.match(/^([\d.]+)rem$/);
    if (remM) {
        const k = remM[1].replace(/^(\d+\.\d*?)0+$/, "$1").replace(/\.$/, "");
        return REM_TO_TW[k] ?? `[${v}]`;
    }
    const pxM = v.match(/^([\d.]+)px$/);
    if (pxM) {
        const n = parseFloat(pxM[1]);
        const rem = n / 16;
        const remStr =
            rem % 1 === 0
                ? String(rem)
                : parseFloat(rem.toFixed(4))
                      .toString()
                      .replace(/0+$/, "")
                      .replace(/\.$/, "");
        return REM_TO_TW[remStr] ?? `[${v}]`;
    }
    if (v.endsWith("%")) {
        const p = parseFloat(v);
        if (p === 100) return "full";
        if (p === 50) return "1/2";
        if (p === 33) return "1/3";
        if (p === 25) return "1/4";
        if (p === 75) return "3/4";
        return `[${v}]`;
    }
    return `[${v}]`;
}

// ─── Colour lookup ────────────────────────────────────────────────────────────
const COLORS = {
    white: "white",
    "#fff": "white",
    "#ffffff": "white",
    black: "black",
    "#000": "black",
    "#000000": "black",
    transparent: "transparent",
    currentcolor: "current",
    currentColor: "current",
    "#fafafa": "zinc-50",
    "#f4f4f5": "zinc-100",
    "#e4e4e7": "zinc-200",
    "#d4d4d8": "zinc-300",
    "#a1a1aa": "zinc-400",
    "#71717a": "zinc-500",
    "#52525b": "zinc-600",
    "#3f3f46": "zinc-700",
    "#27272a": "zinc-800",
    "#18181b": "zinc-900",
    "#09090b": "zinc-950",
    "#f8fafc": "slate-50",
    "#f1f5f9": "slate-100",
    "#e2e8f0": "slate-200",
    "#cbd5e1": "slate-300",
    "#94a3b8": "slate-400",
    "#64748b": "slate-500",
    "#475569": "slate-600",
    "#334155": "slate-700",
    "#1e293b": "slate-800",
    "#0f172a": "slate-900",
    "#020617": "slate-950",
    "#ef4444": "red-500",
    "#dc2626": "red-600",
    "#b91c1c": "red-700",
    "#991b1b": "red-800",
    "#7f1d1d": "red-900",
    "#fca5a5": "red-300",
    "#f97316": "orange-500",
    "#ea580c": "orange-600",
    "#f59e0b": "amber-500",
    "#d97706": "amber-600",
    "#fbbf24": "amber-400",
    "#eab308": "yellow-500",
    "#facc15": "yellow-400",
    "#22c55e": "green-500",
    "#16a34a": "green-600",
    "#15803d": "green-700",
    "#166534": "green-800",
    "#14532d": "green-900",
    "#10b981": "emerald-500",
    "#059669": "emerald-600",
    "#047857": "emerald-700",
    "#86efac": "green-300",
    "#6ee7b7": "emerald-300",
    "#4ade80": "green-400",
    "#3b82f6": "blue-500",
    "#2563eb": "blue-600",
    "#1d4ed8": "blue-700",
    "#1e40af": "blue-800",
    "#1e3a8a": "blue-900",
    "#93c5fd": "blue-300",
    "#60a5fa": "blue-400",
    "#38bdf8": "sky-400",
    "#6366f1": "indigo-500",
    "#4f46e5": "indigo-600",
    "#8b5cf6": "violet-500",
    "#7c3aed": "violet-600",
    "#a855f7": "purple-500",
    "#9333ea": "purple-600",
    "#ec4899": "pink-500",
    "#db2777": "pink-600",
};

function resolveColor(v) {
    return COLORS[v.trim()] ?? COLORS[v.trim().toLowerCase()] ?? null;
}

function colorClass(prefix, val) {
    const v = val.trim();
    const named = resolveColor(v);
    if (named === "white") return `${prefix}-white`;
    if (named === "black") return `${prefix}-black`;
    if (named === "transparent") return `${prefix}-transparent`;
    if (named === "current") return `${prefix}-current`;
    if (named) return `${prefix}-${named}`;
    return `${prefix}-[${esc(v)}]`;
}

// ─── CSS → Tailwind ───────────────────────────────────────────────────────────
function cssToTw(prop, rawVal) {
    const v = String(rawVal).trim();
    switch (prop) {
        case "color":
            if (v === "inherit") return ["text-inherit"];
            if (v === "transparent") return ["text-transparent"];
            return [colorClass("text", v)];
        case "background":
        case "background-color":
            if (v === "none" || v === "transparent") return ["bg-transparent"];
            if (v === "inherit") return ["bg-inherit"];
            return [colorClass("bg", v)];
        case "border": {
            if (v === "none" || v === "0" || v === "0px") return ["border-0"];
            const m = v.match(/^([\d.]+)px\s+solid\s+(.+)$/);
            if (m) {
                const wc = m[1] === "1" ? "border" : `border-[${m[1]}px]`;
                return [wc, colorClass("border", m[2].trim())];
            }
            return [`[border:${esc(v)}]`];
        }
        case "border-top":
        case "border-right":
        case "border-bottom":
        case "border-left": {
            const sides = {
                "border-top": "t",
                "border-right": "r",
                "border-bottom": "b",
                "border-left": "l",
            };
            const s = sides[prop];
            if (v === "none" || v === "0") return [`border-${s}-0`];
            const m = v.match(/^([\d.]+)px\s+solid\s+(.+)$/);
            if (m) {
                const wc =
                    m[1] === "1" ? `border-${s}` : `border-${s}-[${m[1]}px]`;
                return [wc, colorClass(`border-${s}`, m[2].trim())];
            }
            const fullProp = {
                t: "border-top",
                r: "border-right",
                b: "border-bottom",
                l: "border-left",
            }[s];
            return [`[${fullProp}:${esc(v)}]`];
        }
        case "border-color":
            return [colorClass("border", v)];
        case "border-left-color":
            return [colorClass("border-l", v)];
        case "border-right-color":
            return [colorClass("border-r", v)];
        case "border-top-color":
            return [colorClass("border-t", v)];
        case "border-bottom-color":
            return [colorClass("border-b", v)];
        case "opacity": {
            const n = parseFloat(v);
            if (!isNaN(n))
                return [`opacity-${Math.round(n <= 1 ? n * 100 : n)}`];
            return null;
        }
        case "cursor": {
            const m = {
                auto: "cursor-auto",
                default: "cursor-default",
                pointer: "cursor-pointer",
                wait: "cursor-wait",
                text: "cursor-text",
                "not-allowed": "cursor-not-allowed",
                none: "cursor-none",
                help: "cursor-help",
                grab: "cursor-grab",
                grabbing: "cursor-grabbing",
            };
            return m[v] ? [m[v]] : [`cursor-[${esc(v)}]`];
        }
        case "box-sizing":
            if (v === "border-box") return ["box-border"];
            if (v === "content-box") return ["box-content"];
            return null;
        default:
            return null;
    }
}

// ─── Null-ish node check ──────────────────────────────────────────────────────
function isNullishNode(node) {
    return (
        node.kind === ts.SyntaxKind.NullKeyword ||
        node.kind === ts.SyntaxKind.UndefinedKeyword ||
        node.kind === ts.SyntaxKind.FalseKeyword ||
        (ts.isIdentifier(node) && node.text === "undefined")
    );
}

// ─── Static literal extractor ─────────────────────────────────────────────────
function getLiteralValue(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        return { value: node.text, isNum: false };
    if (ts.isNumericLiteral(node)) return { value: node.text, isNum: true };
    if (
        ts.isPrefixUnaryExpression(node) &&
        node.operator === ts.SyntaxKind.MinusToken &&
        ts.isNumericLiteral(node.operand)
    )
        return { value: `-${node.operand.text}`, isNum: true };
    return null;
}

// ─── Recursive value → cn arg ─────────────────────────────────────────────────
/**
 * Try to turn a CSS property's value node into a cn() argument string.
 *  - Static literal → JSON string, e.g. '"text-green-500"'
 *  - Null/undefined → '""'
 *  - Ternary (nested) with all-static branches →
 *      'cond ? "a" : cond2 ? "b" : "c"'
 * Returns null when the node contains runtime variables/template literals.
 */
function valueToCnArg(cssProp, node, source) {
    // Null / undefined → empty class
    if (isNullishNode(node)) return '""';

    // Static literal
    const lit = getLiteralValue(node);
    if (lit) {
        const classes = cssToTw(cssProp, lit.value);
        if (!classes) return null;
        return JSON.stringify(classes.join(" "));
    }

    // Ternary (possibly nested)
    if (ts.isConditionalExpression(node)) {
        const condText = node.condition.getText(source);
        const trueStr = valueToCnArg(cssProp, node.whenTrue, source);
        const falseStr = valueToCnArg(cssProp, node.whenFalse, source);
        if (trueStr === null || falseStr === null) return null;
        return `${condText} ? ${trueStr} : ${falseStr}`;
    }

    return null; // Template literal with variable, function call, etc.
}

/**
 * Handle template literals with a single ternary span:
 *   `prefix${cond ? 'a' : 'b'}suffix`
 * Builds a cn arg by prepending prefix / appending suffix to each branch.
 */
function templateToCnArg(cssProp, node, source) {
    if (!ts.isTemplateExpression(node)) return null;
    if (node.templateSpans.length !== 1) return null;

    const prefix = node.head.text;
    const span = node.templateSpans[0];
    const suffix = span.literal.text;

    function inner(n) {
        if (isNullishNode(n)) {
            const full = prefix + suffix;
            const cls = cssToTw(cssProp, full);
            return cls ? JSON.stringify(cls.join(" ")) : '""';
        }
        const lit = getLiteralValue(n);
        if (lit) {
            const full = prefix + lit.value + suffix;
            const cls = cssToTw(cssProp, full);
            if (!cls) return null;
            return JSON.stringify(cls.join(" "));
        }
        if (ts.isConditionalExpression(n)) {
            const condText = n.condition.getText(source);
            const trueStr = inner(n.whenTrue);
            const falseStr = inner(n.whenFalse);
            if (trueStr === null || falseStr === null) return null;
            return `${condText} ? ${trueStr} : ${falseStr}`;
        }
        return null; // Dynamic interpolation (variable, ||, function call)
    }

    return inner(span.expression);
}

// ─── className builder ────────────────────────────────────────────────────────
function buildClassName(classAttr, staticClasses, cnArgs, source) {
    const hasStatic = staticClasses.length > 0;
    const hasCn = cnArgs.length > 0;
    if (!hasStatic && !hasCn) return null;

    if (!hasCn) {
        // Pure static additions – no need for cn()
        if (!classAttr) return `className="${staticClasses.join(" ")}"`;
        const init = classAttr.initializer;
        if (ts.isStringLiteral(init)) {
            const existing = init.text.trim();
            const merged =
                (existing ? `${existing} ` : "") + staticClasses.join(" ");
            return `className="${merged.replace(/\s+/g, " ")}"`;
        }
        if (ts.isJsxExpression(init)) {
            const inner = init.expression
                ? init.expression.getText(source)
                : '""';
            return `className={\`\${${inner}} ${staticClasses.join(" ")}\`}`;
        }
        return null;
    }

    // Has cn args
    const allParts = [];

    if (classAttr) {
        const init = classAttr.initializer;
        if (ts.isStringLiteral(init)) {
            const existing = init.text.trim();
            const merged = hasStatic
                ? `${existing} ${staticClasses.join(" ")}`.trim()
                : existing;
            allParts.push(JSON.stringify(merged.replace(/\s+/g, " ")));
        } else if (ts.isJsxExpression(init)) {
            const innerText = init.expression
                ? init.expression.getText(source)
                : null;
            if (innerText) {
                if (innerText.match(/^cn\s*\(/)) {
                    // Already cn() — extend it
                    const lastParen = innerText.lastIndexOf(")");
                    const extra = [
                        ...(hasStatic
                            ? [JSON.stringify(staticClasses.join(" "))]
                            : []),
                        ...cnArgs,
                    ].join(", ");
                    return `className={${innerText.slice(0, lastParen)}, ${extra})}`;
                }
                allParts.push(
                    hasStatic
                        ? `\`\${${innerText}} ${staticClasses.join(" ")}\``
                        : innerText,
                );
            }
        }
    } else if (hasStatic) {
        allParts.push(JSON.stringify(staticClasses.join(" ")));
    }

    allParts.push(...cnArgs);
    return `className={cn(${allParts.join(", ")})}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const root = path.join(process.cwd(), "src");
const files = walk(root);

let totalConverted = 0;
let totalFiles = 0;
let totalCnImports = 0;

for (const file of files) {
    const originalCode = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
        file,
        originalCode,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );

    const edits = [];
    let needsCnImport = false;

    function visit(node) {
        if (
            (ts.isJsxOpeningElement(node) ||
                ts.isJsxSelfClosingElement(node)) &&
            node.attributes
        ) {
            const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
            const styleAttr = attrs.find(
                (a) => a.name && a.name.getText(source) === "style",
            );
            if (!styleAttr) {
                ts.forEachChild(node, visit);
                return;
            }

            const init = styleAttr.initializer;
            if (!init || !ts.isJsxExpression(init) || !init.expression) {
                ts.forEachChild(node, visit);
                return;
            }
            const obj = init.expression;
            if (!ts.isObjectLiteralExpression(obj)) {
                ts.forEachChild(node, visit);
                return;
            }

            const staticClasses = [];
            const cnArgs = [];
            const remainingProps = [];

            for (const prop of obj.properties) {
                if (ts.isSpreadAssignment(prop)) {
                    remainingProps.push(prop);
                    continue;
                }
                if (!ts.isPropertyAssignment(prop)) {
                    remainingProps.push(prop);
                    continue;
                }

                let cssProp;
                if (ts.isIdentifier(prop.name)) {
                    cssProp = camelToKebab(prop.name.text);
                } else if (ts.isStringLiteral(prop.name)) {
                    cssProp = prop.name.text;
                } else {
                    remainingProps.push(prop);
                    continue;
                }

                if (cssProp.startsWith("-")) {
                    remainingProps.push(prop);
                    continue;
                }

                const val = prop.initializer;

                // Try direct value conversion (handles static literals + nested ternaries)
                const direct = valueToCnArg(cssProp, val, source);
                if (direct !== null) {
                    totalConverted++;
                    // Is it a plain static string (no ternary operator at top level)?
                    const isStaticLit =
                        direct.startsWith('"') &&
                        !direct.slice(1, -1).includes('"');
                    if (isStaticLit) {
                        staticClasses.push(
                            ...JSON.parse(direct).split(" ").filter(Boolean),
                        );
                    } else {
                        cnArgs.push(direct);
                        needsCnImport = true;
                    }
                    continue;
                }

                // Try template literal with single ternary span
                const tmpl = templateToCnArg(cssProp, val, source);
                if (tmpl !== null) {
                    totalConverted++;
                    const isStaticLit =
                        tmpl.startsWith('"') &&
                        !tmpl.slice(1, -1).includes('"');
                    if (isStaticLit) {
                        staticClasses.push(
                            ...JSON.parse(tmpl).split(" ").filter(Boolean),
                        );
                    } else {
                        cnArgs.push(tmpl);
                        needsCnImport = true;
                    }
                    continue;
                }

                remainingProps.push(prop);
            }

            if (staticClasses.length === 0 && cnArgs.length === 0) {
                ts.forEachChild(node, visit);
                return;
            }

            const classAttr = attrs.find(
                (a) => a.name && a.name.getText(source) === "className",
            );
            const newClassStr = buildClassName(
                classAttr,
                staticClasses,
                cnArgs,
                source,
            );
            if (!newClassStr) {
                ts.forEachChild(node, visit);
                return;
            }

            // Edit: replace or remove style prop
            if (remainingProps.length === 0) {
                edits.push({
                    start: styleAttr.getStart(source),
                    end: styleAttr.getEnd(),
                    text: "",
                });
            } else {
                const remaining = remainingProps
                    .map((p) => p.getText(source))
                    .join(", ");
                edits.push({
                    start: styleAttr.getStart(source),
                    end: styleAttr.getEnd(),
                    text: `style={{ ${remaining} }}`,
                });
            }

            // Edit: replace or insert className
            if (classAttr) {
                edits.push({
                    start: classAttr.getStart(source),
                    end: classAttr.getEnd(),
                    text: newClassStr,
                });
            } else {
                edits.push({
                    start: styleAttr.getStart(source),
                    end: styleAttr.getStart(source),
                    text: `${newClassStr} `,
                });
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(source);

    if (edits.length > 0) {
        edits.sort((a, b) => b.start - a.start || b.end - a.end);
        let out = originalCode;
        for (const e of edits) {
            out = out.slice(0, e.start) + e.text + out.slice(e.end);
        }

        if (
            needsCnImport &&
            !out.includes('from "@/lib/utils"') &&
            !out.includes("from '@/lib/utils'")
        ) {
            const lastImport = out.lastIndexOf("\nimport ");
            if (lastImport !== -1) {
                const lineEnd = out.indexOf("\n", lastImport + 1);
                out =
                    out.slice(0, lineEnd + 1) +
                    `import { cn } from "@/lib/utils";\n` +
                    out.slice(lineEnd + 1);
            } else {
                out = `import { cn } from "@/lib/utils";\n` + out;
            }
            totalCnImports++;
        }

        fs.writeFileSync(file, out, "utf8");
        totalFiles++;
    }
}

console.log(`\nDone!`);
console.log(`  Props converted: ${totalConverted}`);
console.log(`  Files changed:   ${totalFiles}`);
console.log(`  cn imports added: ${totalCnImports}`);
