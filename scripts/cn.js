import AdmZip from "adm-zip"
import path from 'node:path'
import { fileURLToPath } from "node:url"
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')

for (const file of fs.readdirSync(dataDir)) {
  const filePath = path.join(dataDir, file)

  let zip = new AdmZip()
  zip.addLocalFolder(filePath)
  zip.writeZip(path.join(__dirname, `${file}.zip`))

  if (!fs.statSync(filePath).isDirectory()) {
    continue
  }

  for (const item of fs.readdirSync(filePath)) {
    const zip2 = new AdmZip()
    zip2.addLocalFile(path.join(filePath, item))
    zip2.writeZip(path.join(__dirname, `${item}.zip`))
  }
}

console.log(
  fs.readdirSync(__dirname).join('\n')
)