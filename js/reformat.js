#!/usr/bin/node

//// Takes in an association result file (one variant per line), sorts it based on chromosome position and outputs a file for PheWeb

const fs = require('fs')
const readline = require('readline')
const zlib = require('zlib')

if (process.argv.length !== 3) {
    console.error('Usage: node reformat.js filename')
    process.exit(1)
}

const filename = process.argv[2]
const outfilename = filename.replace(/.(txt|tsv)(.gz)?/, '.pheweb.txt')
const fields = ['chrom',
		'pos',
		'ref',
		'alt', // do not change until 'alt', these are parsed from 1:1000:A:C
		'pval',
		'beta',
		'sebeta',
		'ac'
	       ]

const lineReader = filename.endsWith('.gz') ?
      readline.createInterface({
	  input: fs.createReadStream(filename).pipe(zlib.createGunzip())
      }) :
      readline.createInterface({
	  input: fs.createReadStream(filename)
      })

const out = fs.openSync(outfilename, 'w')

console.time('all')
console.time('read')
var variants = []
var fieldIndices = null
var n = 0
var pCol = -1
lineReader.on('line', line => {
    var split = line.split(/\t/)
    if (n === 0) {
	split = split.map(s => s.toLowerCase())
	pCol = split.indexOf('pval')
	if (split.indexOf('se') > -1) split[split.indexOf('se')] = 'sebeta'
	fieldIndices = fields.map(field => split.indexOf(field))
	fs.writeSync(out, fields.join('\t') + '\n', 'utf8')
    } else if (split[pCol] != 'NaN') {
	const variant = split[0].split(':')
	variants.push({
	    chr: variant[0],
	    pos: variant[1],
	    line: variant.join('\t') + '\t' + fieldIndices.slice(4).map(index => split[index]).join('\t') + '\n'
	})
    }
    if (++n % 1e6 == 0) {
	console.log(`${new Date()}\t${n} lines read`)
    }
})

lineReader.on('close', () => {
    console.log(`${variants.length} variants read`)
    console.timeEnd('read')
    console.time('sort')
    variants.sort((a, b) => {
	if (a.chr == b.chr) {
	    return +a.pos - +b.pos
	} else {
	    if (a.chr == 'X') {
		return 1
	    } else if (b.chr == 'X') {
		return -1
	    } else {
		return +a.chr - +b.chr
	    }
	}
    })
    console.timeEnd('sort')
    console.time('write')
    variants.forEach(variant => {
	fs.writeSync(out, variant.line, 'utf8')
    })
    fs.closeSync(out)
    console.timeEnd('write')
    console.timeEnd('all')
})
