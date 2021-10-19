import fs from 'fs/promises'
import path from 'path'
import { remark } from 'remark'
import remarkDetails from 'remark-details'
import remarkDirective from 'remark-directive'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import YAML from 'yaml'
import { getGitAuthors } from '../author-utils.js'
import myDetailsToAst from './details-ast.js'
import myFrontmatter from './frontmatter.js'

const Remark = remark()
  .use(remarkFrontmatter)
  .use(remarkGfm)
  .use(remarkDirective)
  .use(remarkDetails)
  .use(myDetailsToAst)
  .use(myFrontmatter)

async function getMkdocTitles (env) {
  const rawYaml = await fs.readFile(path.resolve(env.repoDir, 'mkdocs.yml'), 'utf8')
  const mkdocs = YAML.parse(rawYaml)

  const ret = {}

  function dfs (self) {
    for (const key of Object.keys(self)) {
      if (typeof self[key] === 'string') ret[`/${self[key]}`] = key
      else dfs(self[key])
    }
  }
  dfs(mkdocs.nav)
  return ret
}

function getTemporaryTags (path) {
  return path.split('/').slice(1, -1)
}

export default async function (env) {
  const titles = await getMkdocTitles(env)

  return async function MarkdownProcessor (target) {
    const doc = (await fs.readFile(target.filePath)).toString()

    // inline author field in document is added in remark transformation phase
    const authors = await getGitAuthors(env.repoDir, target.relPath)

    const allRemark = Remark()
      .data('ow-title', titles[`/${target.relPath}`])
      .data('ow-tags', getTemporaryTags(`/${target.relPath}`))
      .data('ow-authors', authors)
      .data('ow-relpath', target.relPath)
      .freeze()
    const f = await allRemark.process(doc)

    await fs.writeFile(path.resolve(env.outDocDir, target.relPath), f.toString())
  }
}
