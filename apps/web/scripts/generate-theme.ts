import { writeFileSync } from "node:fs";
import { buildThemeCss } from "../src/theme/theme-css.ts";

const target = new URL("../src/app/theme.css", import.meta.url);
writeFileSync(target, buildThemeCss());
console.log(`theme written to ${target.pathname}`);
