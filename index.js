import walk from 'walkdir'
import fs from 'fs/promises'
import fsSync from 'fs'
import markdownAttacher from './markdown/index.js'
import svgAttacher from './svg/index.js'
import path from 'path'

async function CopyAsIsProcessor ({ outDocDir, relPath, filePath }) {
  await fs.copyFile(filePath, path.resolve(outDocDir, relPath))
}

async function SkipProcessor () {}

async function convertAll () {
  const repoDir = path.resolve('.', 'raw')
  const docDir = path.resolve(repoDir, 'docs')
  const outDocDir = path.resolve('.', 'out', 'docs')
  const env = { repoDir, docDir, outDocDir }

  const processors = {}
  async function registerProcessors (env) {
    processors.default = CopyAsIsProcessor
    processors['.md'] = await markdownAttacher(env);
    processors['.svg'] = await svgAttacher(env);
    ['.webmanifest', '.ico', '.css', '.js', '.txt'].forEach(e => {
      processors[e] = SkipProcessor
    })
  }

  await registerProcessors(env)

  walk(docDir, async function (filePath, stat) {
    const relPath = path.relative(docDir, filePath)

    if (stat.isDirectory()) {
      fsSync.mkdirSync(path.resolve(outDocDir, relPath), { recursive: true })
      return
    }

    const processor = processors[path.extname(filePath)] ?? processors.default

    console.log(relPath, processor.name)
    await processor({ relPath, filePath, ...env })
  })
}

convertAll()
