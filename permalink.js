const { program } = require('commander');
program.version('0.0.1');
const fs = require('fs')
    , cheerio = require('cheerio');

program
    .arguments('<input> [output]')
    .requiredOption('-t, --tag <tag>', 'Github release tag to permalink against')
    .parse()

const opts = program.opts();
const args = program.args
const [ inPath, ...rest ] = args
const outPath = rest.length ? rest[0] : null
const tag = opts.tag
console.log(`Tag ${tag}, args ${args}`)

// TODO:
// - ✅ recursive cache clear
// - ✅ toggle auto recurse
// - ✅ deploy to demo bucket
// - recursive mode
// - embed JS/CSS in index.html
// - column formatters
// - configs in index.html
// - README
// - allow toggling domain below
const url = `https://s3idx.s3.amazonaws.com/${tag}`

const links = [
    { tag: 'script', attr:  'src', value: "./dist/bundle.js", },
    { tag:   'link', attr: 'href', value: "./assets/favicon.ico", },
    { tag:   'link', attr: 'href', value: "./assets/index.css", },
]

fs.readFile(inPath, { encoding: 'utf8', }, function(error, data) {
    const $ = cheerio.load(data);
    links.forEach(({ tag, attr, value }) => {
        const selector = `${tag}[${attr}=${value}]`
        const pieces = value.split('/')
        const name = pieces[pieces.length - 1]
        const githubUrl = `${url}/${name}`
        console.log(`Rewriting ${selector} to ${githubUrl}`)
        $(selector).attr(attr, githubUrl)
    })
    if (outPath) {
        fs.writeFileSync(outPath, $.html());
    } else {
        console.log($.html())
    }
});
