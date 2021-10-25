import { visit } from 'unist-util-visit'
import { strict as assert } from 'assert'

export default function attacher () {
  return function transformer (ast) {
    visit(ast, 'detailsContainer', function (node, index, parent) {
      assert.equal(node.children[0].type, 'detailsContainerSummary')

      node.type = 'containerDirective'
      node.children[0].type = 'paragraph'
      node.children[0].data.directiveLabel = true
    })
  }
}
