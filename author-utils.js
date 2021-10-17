import util from 'util'
import { exec as execCallback } from 'child_process'
const exec = util.promisify(execCallback)

const queryAuthors = "cd %s && git log --format='%an %ae' ./docs/%s"
const authorBlacklist = ['24OI-bot']

export async function getGitAuthors (basePath, relPath) {
  const query = util.format(queryAuthors, basePath, relPath)
  const authorsRaw = (await exec(query)).stdout.trim()
  const authorsList = authorsRaw.split('\n')
    .map(e => e.trim().split(' '))

  const ret = {}
  for (let i = 0; i < authorsList.length; i++) {
    const [authorName, authorMail] = authorsList[i]
    // use authorMail as master key to unique all authors
    ret[authorMail] = authorName
  }

  // discard mail
  return Object.values(ret).filter(e => !authorBlacklist.includes(e))
}
