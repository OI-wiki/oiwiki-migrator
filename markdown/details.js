import { visit } from 'unist-util-visit'
function trim (str, ch) {
  let start = 0
  let end = str.length

  while (start < end && str[start] === ch) { ++start }

  while (end > start && str[end - 1] === ch) { --end }

  return (start > 0 || end < str.length) ? str.substring(start, end) : str
}
export default function attacher () {
  const processor = this
  return function transformer (ast) {
    visit(ast, 'detailsContainerSummary', function (node) {
      const md = processor.stringify({ type: 'paragraph', children: node.children })
      const newMd = trim(md, '"').replaceAll(/mdui-shadow-\d+/g, '').trim(' ')
      node.children = processor.parse(newMd).children
    })
  }
}
