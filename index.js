
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const walk = require('walkdir');
const YAML = require('yaml');
const fs = require('fs');
const AuthorUtils = require('./author')

//clone OI-Wiki in ./raw first
const walkPath = __dirname + '/raw/OI-Wiki/docs';

function getTemporaryTags(path){
    return path.split('/').slice(1,-1);
}

const mkdocsTitles = (() => {
    console.log('- Building title index...');
    const rawYaml = fs.readFileSync(__dirname + '/raw/OI-Wiki/mkdocs.yml','utf8');
    const mkdocs = YAML.parse(rawYaml);

    const ret = {};

    function dfs(self){
        for(const key of Object.keys(self)){
            if(typeof self[key] === 'string') ret[`/${self[key]}`] = key;
            else dfs(self[key]);
        }
    }
    dfs(mkdocs.nav);
    return ret;
})();

console.log("- Walking documents...");

function parseAuthorList(data) {
    const originalAuthors = data.split('\n').filter(l => l.startsWith("author:"))
    if (originalAuthors.length > 0) {
        return originalAuthors[0].substring("author:".length).split(',').map(e => e.trim())
    }
    return []
}

function mergeList(l1, l2) {
    let res = new Set([...l1, ...l2]);
    return [...res]
}

(async () => {
    const author = new AuthorUtils({
        repoName: 'oi-wiki',
        repoOwner: 'oi-wiki',
    })

    await author.init()
    
    walk(walkPath, async function(path, stat){
        
        const relPath = path.replace(walkPath, '');
        const relDir = relPath.split('/').slice(0,-1).join('/');
        
        if(stat.isDirectory()){
            fs.mkdirSync(__dirname + `/out/docs${relPath}`, { recursive: true });
            return;
        }
    
        if(!path.endsWith('.md')) {
            //copy possible resources as-is
            fs.copyFileSync(path,__dirname + `/out/docs${relPath}`);
            return;
        }
        
        const frontMatters = {
            title: mkdocsTitles[relPath],
            tags: getTemporaryTags(relPath),
        };
    
        fs.mkdirSync(__dirname + `/out/docs${relDir}`, { recursive: true });
        let bef = fs.readFileSync(path).toString();
        // todo: filter here to convert mkdoc flavor stuff
        const originalAuthors = parseAuthorList(bef)
        frontMatters.author = mergeList(await author.getAuthors(relPath), originalAuthors).join(', ')
        console.log(frontMatters);
        bef = bef
            .split('\n')
            .filter(l => !(l.startsWith('disqus:') || l.startsWith('title:') || l.startsWith('author:') || l.startsWith('pagetime:')))
            .join('\n')
        fs.writeFileSync(__dirname + `/out/docs${relPath}`,
            `---\n${YAML.stringify(frontMatters)}\n---\n\n${bef}`
        );
    });

})()
