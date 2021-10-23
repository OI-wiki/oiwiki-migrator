import { visit, SKIP } from 'unist-util-visit'
import fs from 'fs'
import path from 'path'

const SNIPPET_TOKEN = '--8<-- '

function resolvePath (snip) {
  let str = snip.substring(SNIPPET_TOKEN.length)
  if ((str.startsWith('"') && str.endsWith('"')) ||
     (str.startsWith('\'') && str.endsWith('\''))) {
    str = str.substring(1, str.length - 1)
  }
  return str.replace(/^docs\//, '')
}

export default function attacher () {
  const { docDir } = this.data('ow-target')

  // .mutateSource do not recognize astify snippet grammar
  // let unfold it here for code blocks for now
  function loadSnippet (node) {
    node.value = node.value.split('\n').map(function (v) {
      if (!v.startsWith(SNIPPET_TOKEN)) return v

      const snipPath = path.resolve(docDir, resolvePath(v))
      const f = fs.readFileSync(snipPath, 'utf-8')

      return f
    }).join('\n')
  }

  return function transformer (ast) {
    visit(ast, 'detailsContainer', function (node, index, parent) {
      visit(node, 'code', n => loadSnippet(n))

      const newNode = {
        type: 'code',
        lang: '__internal_dangerously_set_mdast',
        value: JSON.stringify(node)
      }

      parent.children[index] = newNode
      return SKIP
    })
  }
}
