import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import fs from 'fs/promises'
import path from 'path'
import { fromXml } from 'xast-util-from-xml'
import { toXml } from 'xast-util-to-xml'

function vc (s) {
  const c = 'rgba(var(--text-primary))'
  return s
    .replace('black', c)
    // use a brightness calculation if you like
    .replace('#231815', c)
    .replace('rgb(%0,%0,%0)', c)
    .replace('#000000', c)
    .replace('#000', c)
}

function mySvgColorReplacer () {
  return function trasnformer (ast) {
    visit(ast, (e) => e.name === 'style', (e) => {
      e.children[0].value = vc(e.children[0].value)
    })

    visit(ast, (e) => e?.attributes?.style, e => {
      e.attributes.style = vc(e.attributes.style)
    })
  }
}

const xasts = unified().use(mySvgColorReplacer)

export default async function (env) {
  return async function SvgProcessor (target) {
    const doc = (await fs.readFile(target.filePath)).toString()
    const ast = fromXml(doc)
    const f = await xasts.run(ast)

    await fs.writeFile(path.resolve(env.outDocDir, target.relPath), toXml(f))
  }
}
