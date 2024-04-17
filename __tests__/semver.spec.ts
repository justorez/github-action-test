import semver from 'semver'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { it, expect } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = createRequire(import.meta.url)('../package.json')

it('new version', () => {
    const version = '1.0.0-beta.1'
    expect(semver.prerelease('1.0.0')).toBeNull()
    expect(semver.prerelease(version)?.[0]).toBe('beta')
    expect(semver.inc(version, 'patch')).toBe('1.0.0')
    expect(semver.inc(version, 'prerelease', 'beta')).toBe('1.0.0-beta.2')
})

it('update pkg version', () => {
    const newVersion = semver.inc(pkg.version, 'patch')
    pkg.version = newVersion
    console.log(JSON.stringify(pkg, null, 2))
})
