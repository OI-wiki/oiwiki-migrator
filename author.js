const { GraphQLClient, gql } = require('graphql-request')
const walk = require('walkdir')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const async = require('async')

const query = gql`
    fragment CommitLogin on GitObject {
        oid
        ... on Commit {
            authors(first: 50) {
                totalCount
                nodes {
                    name
                    user {
                        login
                    }
                }
            }
        }
    }
    query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
%s
        }
        rateLimit {
            limit
            cost
            remaining
        }
    }
`

function buildQuery(hashs) {
    const aliases = []
    for (const i in hashs) {
        const o = hashs[i]
        aliases.push(`i${i}: object(oid: "${o}") { ...CommitLogin }`)
    }
    return query.replace("%s", aliases.join('\n'))
}


const walkPath = __dirname + '/raw/OI-Wiki/docs';
const gitQueryAuthors = "cd ./raw/OI-Wiki && git log --format='%H' ./docs/%s"

async function generateShaList() {
    console.log("- authors: generate commit list")
    const fileCommits = new Map()
    const shas = new Set()

    const que = async.queue(async function (path) {
        const relPath = path.replace(walkPath, '');

        if (!path.endsWith('.md')) {
            return;
        }

        const commitsRaw = (await exec(gitQueryAuthors.replace('%s', relPath))).stdout.trim();
        const commits = commitsRaw.split('\n').map(e => e.trim());
        const commitsList = fileCommits.get(relPath) || []
        for (const i of commits) {
            commitsList.push(i)
            shas.add(i)
        }
        fileCommits.set(relPath, commitsList)
    }, 20)
    walk.sync(walkPath, function (path, _stat) { que.push(path) })
    await que.drain()

    return { fileCommits, shas }
}

const GITHUB_ENDPOINT = "https://api.github.com/graphql";
const authorBlacklist = ['24OI-bot'];

class AuthorUtils {
    constructor(args) {
        this.auth = args.auth || process.env.GITHUB_TOKEN
        this.repoName = args.repoName
        this.repoOwner = args.repoOwner
        this.commitQueryBatch = args.commitQueryBatch || 1000
        this.blacklist = args.blacklist || authorBlacklist
        this.fallback = this.auth === undefined
            || this.repoName === undefined
            || this.repoOwner === undefined
    }

    async init() {
        if (this.fallback) {
            console.log("- Using fallback local author provider")
            return
        }

        this.graphQL = new GraphQLClient(GITHUB_ENDPOINT)
        this.graphQL.setHeader('Authorization', `Bearer ${this.auth}`)
        try {
            await this.graphQL.request(gql`{ viewer { login } }`)
        } catch (e) {
            console.log(e)
            this.fallback = true
            return
        }

        const { fileCommits, shas } = await generateShaList()
        this.fileAuthors = await this._queryAuthors(Array.from(shas), fileCommits)
    }

    async getAuthors(path) {
        if (this.fallback) return this.getAuthorsFallback(path)
        return this.fileAuthors.get(path)
    }

    async getAuthorsFallback(path) {
        const queryAuthors1 = "cd ./raw/OI-Wiki && git log --format='%an %ae' ./docs/%s";
        const authorsRaw = (await exec(queryAuthors1.replace('%s', path))).stdout.trim();
        const authorsList = authorsRaw.split('\n')
            .map(e => e.trim().split(' '));

        const ret = {};
        for (let i = 0; i < authorsList.length; i++) {
            const [authorName, authorMail] = authorsList[i]
            // use authorMail as master key,
            // to unique all authors
            // dirty imp
            ret[authorMail] = authorName;
        }

        // discard mail
        return Object.values(ret).filter(e => !this.blacklist.includes(e));
    }

    async _queryAuthors(shas, fileCommits) {
        const commitAuthors = new Map()
        for (let i = 0; i < shas.length / this.commitQueryBatch; i++) {
            const qarr = shas.slice(this.commitQueryBatch * i, this.commitQueryBatch * (i + 1))
            const query = buildQuery(qarr)
            const data = await this.graphQL.request(query, {
                owner: this.repoOwner,
                name: this.repoName,
            })
    
            for (const e of Object.values(data["repository"])) {
                commitAuthors.set(e.oid, e.authors.nodes.map(e => e?.user?.login ?? e.name))
            }
    
            console.log(`- authors: query batch ${i} ${JSON.stringify(data.rateLimit)}`)
        }
    
        const fileAuthors = new Map()
        for (const [k, v] of fileCommits.entries()) {
            const authors = new Set()
            for (const c of v) {
                commitAuthors.get(c).forEach(e => authors.add(e))
            }
            const o = fileAuthors.get(k) || []
            fileAuthors.set(k, [...o, ...authors].filter(e => !this.blacklist.includes(e)))
        }
    
        return fileAuthors
    }
}

module.exports = AuthorUtils
