import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import minimist from 'minimist'
import pico from 'picocolors'
import semver from 'semver'
import prompt from '@inquirer/prompts'
import shell from 'shelljs'

type Package = {
    name: string
    version: string
    dependencies?: { [dependenciesPackageName: string]: string }
    peerDependencies?: { [peerDependenciesPackageName: string]: string }
}

let versionUpdated = false

const packageJson = createRequire(import.meta.url)('../package.json') as Package
const currentVersion = packageJson.version
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = minimist(process.argv.slice(2), {
    alias: {
        skipBuild: 'skip-build',
        skipTests: 'skip-tests',
        skipGit: 'skip-git',
        skipPrompts: 'skip-prompts'
    }
})

type FlagArg = boolean | undefined
const preId = args.preid || semver.prerelease(currentVersion)?.[0]
const isDryRun: FlagArg = args.dry
const skipTests: FlagArg = args.skipTests
const skipBuild: FlagArg = args.skipBuild
const skipPrompts: FlagArg = args.skipPrompts
const skipGit: FlagArg = args.skipGit
const keepThePackageName = (pkgName: string) => pkgName

type ReleaseType = semver.ReleaseType | 'next'
const versionIncrements: ReadonlyArray<ReleaseType> = [
    'major',
    'minor',
    'patch',
    'next',
    'prepatch',
    'preminor',
    'premajor'
]

const inc = (i: ReleaseType) => {
    const releaseType = i === 'next' ? (preId ? 'prerelease' : 'patch') : i
    return semver.inc(currentVersion, releaseType, preId)
}
const run = (cmd: string) => {
    if (isDryRun) {
        console.log(pico.blue(`[dryrun] ${cmd}`))
    } else {
        return shell.exec(cmd, { silent: true }).stdout
    }
}
const step = (msg: string) => console.log(pico.cyan(msg))

async function main() {
    let targetVersion = args._[0]

    if (!targetVersion) {
        // no explicit version, offer suggestions
        const release = await prompt.select({
            message: 'Select release type',
            loop: true,
            choices: versionIncrements
                .map((i) => {
                    const value = inc(i)
                    return {
                        name: `${i.padStart(8, ' ')} ${value}`,
                        value
                    }
                }).concat({ name: `${'custom'.padStart(8, ' ')} ...`, value: 'custom' })
        })

        if (release === 'custom') {
            const result = await prompt.input({
                message: 'Input custom version',
                default: currentVersion
            })
            targetVersion = result
        } else {
            targetVersion = release || ''
        }
    }

    if (!semver.valid(targetVersion)) {
        throw new Error(`invalid target version: ${targetVersion}`)
    }

    if (skipPrompts) {
        step(`Releasing v${targetVersion}...`)
    } else {
        const confirmRelease = await prompt.confirm({
            message: `Releasing v${targetVersion}. Confirm?`
        })

        if (!confirmRelease) {
            return
        }
    }

    if (!skipTests) {
        step('\nRunning tests...')
        if (!isDryRun) {
            run('pnpm test')
        } else {
            console.log(`Skipped (dry run)`)
        }
    } else {
        step('Tests skipped.')
    }

    // update all package versions and inter-dependencies
    step('\nUpdating cross dependencies...')
    updateVersions(targetVersion, keepThePackageName)
    versionUpdated = true

    // build all packages with types
    step('\nBuilding all packages...')
    if (!skipBuild) {
        run('pnpm build --withTypes')
    } else {
        console.log(`(skipped)`)
    }

    // generate changelog
    step('\nGenerating changelog...')
    run('pnpm changelog')

    if (!skipPrompts) {
        const changelogOk = await prompt.confirm({
            message: `Changelog generated. Does it look good?`
        })

        if (!changelogOk) {
            return
        }
    }

    if (!skipGit) {
        const out = run('git diff')
        if (out) {
            step('\nCommitting changes...')
             run('git add -A')
             run(`git commit -m "release: v${targetVersion} :tada:"`)
        } else {
            console.log('No changes to commit.')
        }
    }

    // publish packages
    step('\nPublishing packages...')

    const additionalPublishFlags = []
    if (isDryRun) {
        additionalPublishFlags.push('--dry-run')
    }
    if (skipGit || isDryRun) {
        additionalPublishFlags.push('--no-git-checks')
    }

    // publishPackage(packageJson.name, targetVersion, additionalPublishFlags)

    // push to GitHub
    if (!skipGit) {
        step('\nPushing to GitHub...')
        run(`git tag v${targetVersion}`)
        run(`git push origin refs/tags/v${targetVersion}`)
        run('git push')
    }

    if (isDryRun) {
        console.log(`\nDry run finished - run git diff to see package changes.`)
    }

    console.log()
}

function updateVersions(version: string, getNewPackageName = keepThePackageName) {
    const pkgRoot = path.resolve(__dirname, '..')
    const pkgPath = path.resolve(pkgRoot, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Package
    pkg.name = getNewPackageName(pkg.name)
    pkg.version = version
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

main().catch((err) => {
    if (versionUpdated) {
        // revert to current version on failed releases
        updateVersions(currentVersion)
    }
    console.error(err)
    process.exit(1)
})
