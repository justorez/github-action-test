import shell from 'shelljs'
import { execa } from 'execa'

const { stdout } = shell.exec('git diff', {
    silent: true
})
console.log(stdout.slice(0, 100))
execa('git', ['diff'], { stdio: 'pipe' })
