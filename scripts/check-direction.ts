import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const physical =
  /^(-?(m|p|scroll-m|scroll-p)[lr]-\S+|-?(left|right)-\S+|(border|rounded)-[lr](-\S+)?|rounded-[tb][lr](-\S+)?|(text|float|clear)-(left|right))$/;
const skippedDirectories = new Set(["node_modules", ".next", "lint-fixtures"]);
const checkedExtensions = /\.(tsx?|jsx?|css|mdx)$/;

function listFiles(path: string): string[] {
  if (!statSync(path).isDirectory()) {
    return [path];
  }
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      return skippedDirectories.has(entry.name) ? [] : listFiles(child);
    }
    return checkedExtensions.test(entry.name) ? [child] : [];
  });
}

function findPhysicalClasses(file: string): string[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line, index) =>
      line
        .split(/[\s"'`{}()<>,;]+/)
        .map((token) => token.split(":").at(-1)?.replace(/^!|!$/g, "") ?? "")
        .filter((utility) => physical.test(utility))
        .map((utility) => `${file}:${index + 1}: physical utility "${utility}", use a logical one`),
    );
}

const roots = process.argv.slice(2);
const problems = roots.flatMap(listFiles).flatMap(findPhysicalClasses);

for (const problem of problems) {
  console.error(problem);
}
if (problems.length > 0) {
  console.error(`${problems.length} physical-direction class(es) found`);
  process.exit(1);
}
console.log(`direction check passed for ${roots.join(", ")}`);
