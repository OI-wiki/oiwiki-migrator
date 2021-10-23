import { visit } from 'unist-util-visit'

export default function attacher () {
  const processor = this
  const spliter = /[^\s"]+|"([^"]*)"/g

  return function transformer (ast) {
    visit(ast, 'detailsContainerSummary', function (node) {
      const md = processor.stringify({ type: 'paragraph', children: node.children })

      // https://stackoverflow.com/a/18647776
      let arr = []
      let match
      do {
        match = spliter.exec(md)
        if (match != null) {
          arr.push(match[1] ? match[1] : match[0])
        }
      } while (match !== null)

      arr = arr.filter(e => !e.startsWith('mdui-shadow'))
      node.children = processor.parse(arr.join(' '))
    })
  }
}
