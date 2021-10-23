import { visitParents } from 'unist-util-visit-parents'

export default function attacher () {
  return function transformer (ast) {
    visitParents(ast, 'code', function (node, ancestors) {
      // do not wrap over another wrap
      for (const ancestor of ancestors) {
        if (ancestor.type === 'containerDirective' && ancestor.name === 'codes') {
          return
        }
      }

      if (node.lang !== 'cpp') return
      if (!node.value.startsWith('// C++ Version')) return

      const parent = ancestors[ancestors.length - 1]
      const index = parent.children.indexOf(node)
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
