import YAML from 'yaml'
import { toString } from 'mdast-util-to-string'

export default function attacher () {
  let author = this.data('ow-authors')
  // const relpath = this.data('ow-relpath')
  const frontmatter = {
    title: this.data('ow-title'),
    tags: this.data('ow-tags')
  }

  return function tranformer (ast) {
    // prune original frontmatter-like field
    // only visit root level
    const pruneFields = ['disqus:', 'title:']
    ast.children = ast.children.filter(e => {
      if (e.type !== 'paragraph') return true

      const str = toString(e)
      if (str.startsWith('author:')) {
        const fieldAuthors = str.substring('author:'.length).split(',').map(e => e.trim())
        author = [...new Set(author, fieldAuthors)]
        return false
      }

      for (const field of pruneFields) {
        if (str.startsWith(field)) return false
      }

      return true
    })

    // add standard frontmatter
    const finalmatter = {
      author: author.join(', '),
      ...frontmatter
    }
    // console.log(' -', relpath, finalmatter)
    ast.children.unshift({
      type: 'yaml',
      value: YAML.stringify(finalmatter)
    })
  }
}
