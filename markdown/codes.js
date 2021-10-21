import { visit } from 'unist-util-visit'

export default function attacher () {
  return function transformer (ast) {
    visit(ast, 'code', function (node, index, parent) {
      if (node.lang !== 'cpp') return
      if (!node.value.startsWith('// C++ Version')) return

      const nextNode = parent.children?.[index + 1]
      if (nextNode?.type !== 'code' || nextNode?.lang !== 'python') return
      if (!nextNode.value.startsWith('# Python Version')) return

      parent.children[index] = {
        type: 'containerDirective',
        name: 'codes',
        attributes: {},
        children: [node, nextNode]
      }

      parent.children.splice(index + 1, 1)
    })
  }
}
