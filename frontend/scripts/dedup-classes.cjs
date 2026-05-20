#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(tsx|jsx)$/.test(e.name)) out.push(p);
    }
    return out;
}

function dedup(str) {
    const parts = str.trim().split(/\s+/);
    const seen = new Set();
    return parts
        .filter((p) => {
            if (seen.has(p)) return false;
            seen.add(p);
            return true;
        })
        .join(" ");
}

let total = 0;
let files = 0;

for (const file of walk(path.join(process.cwd(), "src"))) {
    const code = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
        file,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
    const edits = [];

    function visit(node) {
        if (
            (ts.isJsxOpeningElement(node) ||
                ts.isJsxSelfClosingElement(node)) &&
            node.attributes
        ) {
            for (const attr of node.attributes.properties) {
                if (!ts.isJsxAttribute(attr)) continue;
                if (!attr.name || attr.name.getText(source) !== "className")
                    continue;
                const init = attr.initializer;
                if (!init || !ts.isStringLiteral(init)) continue;
                const orig = init.text;
                const deduped = dedup(orig);
                if (deduped !== orig) {
                    edits.push({
                        start: init.getStart(source),
                        end: init.getEnd(),
                        text: JSON.stringify(deduped),
                    });
                    total++;
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(source);

    if (edits.length > 0) {
        edits.sort((a, b) => b.start - a.start);
        let out = code;
        for (const e of edits)
            out = out.slice(0, e.start) + e.text + out.slice(e.end);
        fs.writeFileSync(file, out, "utf8");
        files++;
    }
}

console.log(`Duplicate classes removed: ${total} (across ${files} files)`);
