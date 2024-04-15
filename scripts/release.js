import semver from "semver";
import { readFileSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { select } from "@inquirer/prompts";
import shell from "shelljs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "../package.json"), "utf8")
);

const ReleaseTypes = [
  "major",
  "minor",
  "patch",
  "prerelease",
  "preminor",
  "premajor",
  "prepatch",
];

const releaseType = await select({
  message: "Select a release type",
  choices: ReleaseTypes.map((t) => ({ name: t, value: t })),
  loop: true,
});

console.log(semver.inc(pkg.version, releaseType))

const out = shell.exec(`pnpm version ${releaseType} -m "chore: release v%s"`, {
  silent: true,
});
console.log(`chore: release ${out.stdout}`);
