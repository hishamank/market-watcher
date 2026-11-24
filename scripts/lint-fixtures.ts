import { spawnSync } from "node:child_process";

interface Fixture {
  file: string;
  tool: "oxlint" | "direction";
  expected: string | null;
}

const fixtures: Fixture[] = [
  {
    file: "apps/gateway/src/lint-fixtures/comment.ts",
    tool: "oxlint",
    expected: "local(no-comments)",
  },
  { file: "apps/gateway/src/lint-fixtures/directives.ts", tool: "oxlint", expected: null },
  {
    file: "apps/gateway/src/lint-fixtures/long-function.ts",
    tool: "oxlint",
    expected: "eslint(max-lines-per-function)",
  },
  {
    file: "apps/gateway/src/lint-fixtures/long-file.ts",
    tool: "oxlint",
    expected: "eslint(max-lines)",
  },
  {
    file: "apps/web/src/lint-fixtures/use-effect-import.tsx",
    tool: "oxlint",
    expected: "eslint(no-restricted-imports)",
  },
  {
    file: "apps/web/src/lint-fixtures/use-effect-member.tsx",
    tool: "oxlint",
    expected: "eslint(no-restricted-properties)",
  },
  {
    file: "apps/web/src/integrations/lint-fixtures/effect-allowed.tsx",
    tool: "oxlint",
    expected: null,
  },
  {
    file: "packages/core/src/lint-fixtures/window-global.ts",
    tool: "oxlint",
    expected: "eslint(no-restricted-globals)",
  },
  {
    file: "packages/core/src/lint-fixtures/dom-import.ts",
    tool: "oxlint",
    expected: "eslint(no-restricted-imports)",
  },
  {
    file: "apps/web/src/lint-fixtures/physical-margin.tsx",
    tool: "direction",
    expected: 'physical utility "ml-2"',
  },
];

function run(fixture: Fixture) {
  const [command, args] =
    fixture.tool === "oxlint"
      ? ["pnpm", ["exec", "oxlint", "--deny-warnings", "-f", "unix", fixture.file]]
      : ["node", ["scripts/check-direction.ts", fixture.file]];
  const result = spawnSync(command, args, { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function check(fixture: Fixture): string | null {
  const { status, output } = run(fixture);
  if (fixture.expected === null) {
    return status === 0 ? null : `expected a clean run, got:\n${output}`;
  }
  if (status === 0) {
    return `expected ${fixture.expected} to fail, but it passed`;
  }
  return output.includes(fixture.expected) ? null : `expected ${fixture.expected}, got:\n${output}`;
}

let failures = 0;
for (const fixture of fixtures) {
  const problem = check(fixture);
  const verdict = fixture.expected === null ? "passes" : `fails with ${fixture.expected}`;
  console.log(`${problem === null ? "ok" : "FAIL"} ${fixture.file} ${verdict}`);
  if (problem !== null) {
    failures += 1;
    console.error(problem);
  }
}
process.exit(failures === 0 ? 0 : 1);
