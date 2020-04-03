
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const walk = require('walkdir');
const YAML = require('yaml');
const fs = require('fs');

//clone OI-Wiki in ./raw first
const walkPath = __dirname + '/raw/OI-Wiki/docs';
const queryAuthors = "cd ./raw/OI-Wiki && git blame --line-porcelain ./docs/%s";
    
const authorBlacklist = ['24OI-bot'];

async function getAuthorsList(path) {
    const authorsRaw = (await exec(queryAuthors.replace('%s',path))).stdout.trim();
    const authorsList = authorsRaw.split('\n')
        .filter(entry => entry.startsWith('author') || entry.startsWith('author-mail'))
        .map(e => e.trim().split(' '));
    
    const ret = {};
    // author-mail and author SHOULD in pair, 
    // and there's should be even counts of items
    for(let i = 0; i < authorsList.length; i += 2){
        const authorName = authorsList[i].slice(1).join(' ');
        const authorMail = authorsList[i + 1].slice(1).join(' ');

        // use authorMail as master key,
        // to unique all authors
        // dirty imp
        ret[authorMail] = authorName;
    }

    // discard mail
    return Object.values(ret).filter(e => !authorBlacklist.includes(e));
}

function getTemporaryTags(path){
    return path.split('/').slice(1,-1);
}

const mkdocsTitles = (() => {
    console.log(':: Building title index...');
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

console.log(":: Walking documents...");
walk(walkPath, async function(path, stat){
    if(!path.endsWith('.md')) return;

    const relPath = path.replace(walkPath, '');
    const frontMatters = {
        title: mkdocsTitles[relPath],
        tags: getTemporaryTags(relPath),
        author: (await getAuthorsList(relPath)).join(', ')
    };

    const relDir = relPath.split('/').slice(0,-1).join('/');

    console.log(frontMatters);
    fs.mkdirSync(__dirname + `/out/docs${relDir}`, { recursive: true});
    const bef = fs.readFileSync(path).toString();
    // todo: filter here to convert mkdoc flavor stuff

    fs.writeFileSync(__dirname + `/out/docs${relPath}`,
        `---\n${YAML.stringify(frontMatters)}---\n\n${bef}`
    );
});