import { visit } from 'unist-util-visit'
import lodash from 'lodash'
const { trim } = lodash
export default function attacher () {
  const processor = this
  return function transformer (ast) {
    visit(ast, 'detailsContainerSummary', function (node) {
      const md = processor.stringify({ type: 'paragraph', children: node.children })
      const removeMduiMd = md.replaceAll(/mdui-shadow-\d+\s+/g, '')
      const removeNewlineMd = trim(trim(removeMduiMd, ' '), '\n')
      const newMd = trim(removeNewlineMd, '"')
      node.children = processor.parse(newMd).children
    })
  }
}
