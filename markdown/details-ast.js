import { visit, SKIP } from 'unist-util-visit'

export default function attacher () {
  return function transformer (ast) {
    visit(ast, 'detailsContainer', function (node, index, parent) {
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
