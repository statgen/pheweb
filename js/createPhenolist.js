#!/usr/bin/env node

//// Creates a pheno-list.json for PheWeb from a directory with association files, a phenotype annotation file and a category annotation file

const fs = require('fs')
const zlib = require('zlib')
const rl = require('readline')
const async = require('async')

const nSampleColName = 'nCompleteSamples'
//const filenameRE = /([A-Za-z0-9]+)_([A-Za-z0-9_]+)_GWAS_result_trimmed.assoc.pheweb.txt/
const filenameRE = /([A-Za-z0-9]+)_([A-Za-z0-9_]+)_GWAS_result_trimmed.assoc.tsv.gz/

if (process.argv.length !== 5) {
    console.error(`Usage: node ${__filename} dir phenofile categoryfile`)
    process.exit(1)
}

const annotations = {}
fs.readFileSync(process.argv[3], 'utf8').trim().split(/\r?\n|\r/)
    .forEach(line => {
	const split = line.split(/\t/)
	annotations[split[0].trim()] = {
	    code: split[0].trim(),
	    name: split[1].trim(),
	    nCases: +split[2].trim()
	}
    })

const categories = {}
fs.readFileSync(process.argv[4], 'utf8').trim().split(/\r?\n|\r/)
    .forEach(line => {
	const split = line.split(/\t/)
	categories[split[0].trim()] = {
	    code: split[0].trim(),
	    name: split[1].trim()
	}
    })

console.error(`${Object.keys(annotations).length} phenotypes\' annotations and ${Object.keys(categories).length} categories read`)

const files = fs.readdirSync(process.argv[2]).filter(file => file.match(filenameRE))
console.error(`${files.length} association files found in ${process.argv[2]}`)

const phenos = async.mapSeries(files, (file, cb) => {

    const filepath = `${process.argv[2]}/${file}`
    var n = 0
    var nSampleCol = -1
    var nSamples = -1
    const reader = rl.createInterface({
	input: fs.createReadStream(filepath).pipe(zlib.createGunzip())
    })
    reader.on('line', line => {
	++n
	if (n === 1) {
	    nSampleCol = line.split(/\t/).indexOf(nSampleColName)
	    if (nSampleCol < 0) {
		return cb(`No ${nSampleColName} column in ${filepath}`)
	    }
	}
	if (n === 2) {
	    nSamples = line.split(/\t/)[nSampleCol]
	    reader.close()
	    const m = file.match(filenameRE)
	    if (!m || !m[1] || !m[2]) {
		return cb(`Unexpected file name: ${filepath}`)
	    }
	    const cat = categories[m[1]]
	    if (!cat) {
		console.error(`Category not in ${process.argv[4]}: ${m[1]}, skipping  ${m[1]}_${m[2]}`)
		return cb(null, null)
	    }
	    const ann = annotations[`${m[1]}_${m[2]}`]
	    if (!ann) {
		console.error(`No annotations for ${m[1]}_${m[2]}, skipping`)
		return cb(null, null)
	    } else {
		return cb(null, {
		    assoc_files: [filepath],
		    phenocode: ann.code,
		    phenostring: ann.name,
		    category: cat.name,
		    num_cases: ann.nCases,
		    num_controls: nSamples - ann.nCases
		})
	    }
	}
    })
}, (err, phenos) => {
    if (err) console.error(err)
    else console.log(JSON.stringify(phenos.filter(pheno => !!pheno), null, 4))
})
