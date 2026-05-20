#!/usr/bin/env node
/**
 * fix-tw-v4-warnings.cjs
 *
 * Fixes Tailwind v4 "can be written as" warnings:
 *  1. `prefix-[var(--xxx)]` → `prefix-(--xxx)`  (CSS variable shorthand)
 *  2. `spacing-util-[Xpx]`  → `spacing-util-N`  (px → TW v4 spacing units, N = X/4)
 *  3. `z-[N]`               → `z-N`             (z-index plain integers)
 *  4. `[text-shadow:none]`  → `text-shadow-none`
 *  5. `[text-shadow:X]`     → `text-shadow-[X]`  (short arbitrary)
 *  6. `max-w-[Xpx]`         → `max-w-N`         (already covered by #2 but explicit)
 */

"use strict";
const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(tsx|jsx|ts)$/.test(e.name)) out.push(p);
    }
    return out;
}

// ─── Spacing utilities (px → TW v4 units: N = px/4) ─────────────────────────
const SPACING_UTILS = [
    "h",
    "w",
    "min-h",
    "min-w",
    "max-h",
    "max-w",
    "size",
    "top",
    "right",
    "bottom",
    "left",
    "inset",
    "inset-x",
    "inset-y",
    "inset-inline",
    "inset-block",
    "start",
    "end",
    "p",
    "px",
    "py",
    "pt",
    "pr",
    "pb",
    "pl",
    "m",
    "mx",
    "my",
    "mt",
    "mr",
    "mb",
    "ml",
    "gap",
    "gap-x",
    "gap-y",
    "space-x",
    "space-y",
    "basis",
    "translate-x",
    "translate-y",
    "scroll-mt",
    "scroll-mb",
    "scroll-ml",
    "scroll-mr",
    "scroll-m",
    "scroll-p",
    "scroll-px",
    "scroll-py",
    "scroll-pt",
    "scroll-pr",
    "scroll-pb",
    "scroll-pl",
];

// Build regex: match class-[Xpx] for spacing utilities
// Also handle negative: -prefix-[Xpx]
const spacingPattern = new RegExp(
    `(?<![\\w-])(-)?(${SPACING_UTILS.join("|")})-\\[(\\d+(?:\\.\\d+)?)px\\]`,
    "g",
);

function pxToScale(px) {
    const val = parseFloat(px) / 4;
    // Format: remove unnecessary trailing zeros
    if (val === Math.floor(val)) return String(val);
    // Up to 4 decimal places, trim trailing zeros
    return parseFloat(val.toFixed(4)).toString();
}

function fixCode(code) {
    let out = code;

    // 1. CSS variable shorthand: prefix-[var(--xxx)] → prefix-(--xxx)
    out = out.replace(/\b([\w-]+-)\[var\((--[\w-]+)\)\]/g, "$1($2)");

    // 2. Spacing px → TW v4 units
    out = out.replace(spacingPattern, (match, neg, prefix, px) => {
        const scale = pxToScale(px);
        return `${neg || ""}${prefix}-${scale}`;
    });

    // 3. z-index integers: z-[N] → z-N (integers only, not decimals)
    out = out.replace(/\bz-\[(\d+)\]/g, "z-$1");

    // 4. text-shadow:none
    out = out.replace(/\[text-shadow:none\]/g, "text-shadow-none");

    // 4b. Fix previously wrong backdrop-[value] → backdrop-filter-[value]
    out = out.replace(/\bbackdrop-\[(?!filter)/g, "backdrop-filter-[");

    // 5. [css-property:value] → css-property-[value]
    //    Only for properties whose names match Tailwind utility prefixes exactly.
    //    Regex captures everything between the colon and the closing ] as the value,
    //    being careful with nested parens (we use a non-] character class).
    const propToPrefix = [
        ["filter", "filter"],
        ["backdrop-filter", "backdrop-filter"],
        ["animation", "animation"],
        ["transform", "transform"],
        ["grid-template-columns", "grid-template-columns"],
        ["border-bottom", "border-bottom"],
        ["border-top", "border-top"],
        ["border-left", "border-left"],
        ["border-right", "border-right"],
        ["border", "border"],
        ["text-shadow", "text-shadow"],
    ];
    for (const [cssProp, twPrefix] of propToPrefix) {
        const re = new RegExp(`\\[${cssProp}:([^\\]]+)\\]`, "g");
        out = out.replace(re, (_, val) => `${twPrefix}-[${val}]`);
    }

    return out;
}

const root = path.join(process.cwd(), "src");
const files = walk(root);

let changed = 0;
for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const fixed = fixCode(original);
    if (fixed !== original) {
        fs.writeFileSync(file, fixed, "utf8");
        changed++;
    }
}

console.log(`Done! Files changed: ${changed}`);
