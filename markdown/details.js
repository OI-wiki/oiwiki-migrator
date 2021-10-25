import { visit } from 'unist-util-visit'
import lodash from 'lodash'
const { trim, trimEnd } = lodash
export default function attacher () {
  const processor = this
  return function transformer (ast) {
    visit(ast, 'detailsContainerSummary', function (node) {
      const md = processor.stringify({ type: 'paragraph', children: node.children })
      const removeNewlineMd = trimEnd(trim(md, ' '), '\n')
      const newMd = trim(removeNewlineMd, '"').replaceAll(/mdui-shadow-\d+/g, '').trim(' ')
      node.children = processor.parse(newMd).children
    })
  }
}
