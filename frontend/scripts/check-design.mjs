import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const source = path.join(project, "src");
const tokenTree = postcss.parse(
  fs.readFileSync(path.join(source, "tokens.css"), "utf8"),
);
const definitions = new Set();
const dependencies = new Map();
const references = (value) =>
  [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
tokenTree.walkDecls((declaration) => {
  if (!declaration.prop.startsWith("--")) return;
  definitions.add(declaration.prop);
  dependencies.set(
    declaration.prop,
    new Set([
      ...(dependencies.get(declaration.prop) || []),
      ...references(declaration.value),
    ]),
  );
});

const errors = [];
for (const [name, refs] of dependencies) {
  for (const ref of refs) {
    if (!definitions.has(ref))
      errors.push(`tokens.css: ${name} references undefined ${ref}`);
  }
}
function visit(name, stack = new Set(), finished = new Set()) {
  if (stack.has(name)) {
    errors.push(`Token dependency cycle: ${[...stack, name].join(" -> ")}`);
    return;
  }
  if (finished.has(name)) return;
  stack.add(name);
  for (const ref of dependencies.get(name) || []) visit(ref, stack, finished);
  stack.delete(name);
  finished.add(name);
}
const finished = new Set();
for (const name of definitions) visit(name, new Set(), finished);

const runtime = new Set(["--selected-row"]);
let stylesheetCount = 0;
for (const file of fs
  .readdirSync(source)
  .filter((f) => f.endsWith(".css") && f !== "tokens.css")) {
  stylesheetCount++;
  const tree = postcss.parse(fs.readFileSync(path.join(source, file), "utf8"));
  tree.walkDecls((declaration) => {
    const { prop, value } = declaration;
    const at = `${file}:${declaration.source.start.line} ${prop}`;
    for (const ref of references(value)) {
      if (!definitions.has(ref) && !runtime.has(ref))
        errors.push(`${at}: undefined ${ref}`);
    }
    if (prop.startsWith("--") && !runtime.has(prop))
      errors.push(`${at}: define design values in tokens.css`);
    if (
      /#(?:[0-9a-f]{3,8})\b|\b(?:rgb|rgba|hsl|hsla|color-mix|linear-gradient|radial-gradient)\(/i.test(
        value,
      )
    ) {
      errors.push(`${at}: raw color/material; use a semantic token`);
    }
    if (/-?\d*\.?\d+(?:px|rem|ms)\b/.test(value)) {
      errors.push(`${at}: raw fixed size/duration; use a token`);
    }
    if (prop === "box-shadow" && !/^(?:none|var\(--[\w-]+\))$/.test(value)) {
      errors.push(`${at}: use an elevation token`);
    }
    if (
      /backdrop-filter$/.test(prop) &&
      !/^(?:none|var\(--[\w-]+\))$/.test(value)
    ) {
      errors.push(`${at}: use a material filter token`);
    }
    if (prop === "font-weight" && /^\d/.test(value))
      errors.push(`${at}: use a weight token`);
    if (
      /^transition|^animation/.test(prop) &&
      /(?<![\w-])[1-9][\d.]*s\b/.test(value)
    ) {
      errors.push(`${at}: use a motion token`);
    }
  });
}
// Lucide sizes/strokes and auto-resizing textareas must follow CSS roles too.
const app = fs.readFileSync(path.join(source, "App.tsx"), "utf8");
if (/\b(?:size|strokeWidth)=\{\d/.test(app))
  errors.push("App.tsx: use icon tokens, not numeric sizes/strokes");
if (/onPointerMove|nav-light|moveNavigationLight/.test(app))
  errors.push("App.tsx: pointer-following lighting is disabled by design");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Design check passed: ${definitions.size} tokens, ${stylesheetCount} stylesheet(s), no raw visual constants.`,
  );
}
