import { readdirSync } from "node:fs";

const directory = process.argv[2] ?? "docs/adr";
const fileName = /^(\d{4})-[a-z0-9]+(-[a-z0-9]+)*\.md$/;

const files = readdirSync(directory).filter((name) => name.endsWith(".md"));
const misnamed = files.filter((name) => !fileName.test(name));
const byNumber = Map.groupBy(
  files.filter((name) => fileName.test(name)),
  (name) => name.slice(0, 4),
);
const duplicates = [...byNumber].filter(([, names]) => names.length > 1);
const nextFree = String(Math.max(0, ...[...byNumber.keys()].map(Number)) + 1).padStart(4, "0");

const problems = [
  ...misnamed.map((name) => `${directory}/${name}: name it NNNN-kebab-case-title.md`),
  ...duplicates.map(
    ([number, names]) => `ADR ${number} is used by ${names.length} files: ${names.join(", ")}`,
  ),
];

for (const problem of problems) {
  console.error(problem);
}
if (problems.length > 0) {
  console.error(`${problems.length} ADR problem(s). The next free number is ${nextFree}.`);
  process.exit(1);
}
console.log(`ADR check passed: ${files.length} ADRs, each with its own number`);
