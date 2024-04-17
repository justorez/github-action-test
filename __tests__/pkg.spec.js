import semver from "semver";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = createRequire(import.meta.url)('../package.json')

const newVersion = semver.inc(pkg.version, 'patch')
pkg.version = newVersion

console.log(JSON.stringify(pkg, null, 2))