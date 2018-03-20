#!/usr/bin/env node

//// Augments a pheno-list.json for PheWeb with annotations

const fs = require('fs')

if (process.argv.length !== 6) {
    console.error(`Usage: node ${__filename} phenolistfile phenofile phenonamefile categoryfile`)
    process.exit(1)
}

const annotations = {}
fs.readFileSync(process.argv[4], 'utf8').trim().split(/\r?\n|\r/)
    .forEach(line => {
	const split = line.split(/\t/)
	annotations[split[0].trim()] = {
	    code: split[0].trim(),
	    name: split[1].trim(),
	    nCases: 0,
	    nCtrls: 0
	}
    })

const categories = {}
fs.readFileSync(process.argv[5], 'utf8').trim().split(/\r?\n|\r/)
    .forEach(line => {
	const split = line.split(/\t/)
	categories[split[0].trim()] = {
	    code: split[0].trim(),
	    name: split[1].trim()
	}
    })

var phenolist = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
console.error(`${phenolist.length} phenotypes, ${Object.keys(annotations).length} phenotypes\' annotations and ${Object.keys(categories).length} categories read`)

const lines = fs.readFileSync(process.argv[3], 'utf8').trim().split(/\r?\n|\r/)
const fields = lines[0].split(/\t/)

lines.slice(1).forEach(line => {
    const split = line.split(/\t/)
    split.forEach((value, i) => {
	if (annotations[fields[i]]) {
	    if (value == '0') annotations[fields[i]].nCtrls++
	    if (value == '1') annotations[fields[i]].nCases++
	}
    })
})

phenolist = phenolist.map(pheno => {
    const m = pheno.phenocode.match(/([A-Z0-9]+)_(.*)/)
    if (!m) {
	console.error(`Unexpected phenocode in phenolist file: ${pheno.phenocode}`)
	return null
    }
    const cat = categories[m[1]]
    if (!cat) {
	console.error(`Unexpected category: ${m[1]}, using 'Other'`)
	pheno.category = 'Other'
	// console.error(`Unexpected category: ${m[1]}, skipping phenocode ${pheno.phenocode}`)
	// return null
    } else {
	pheno.category = cat.name
    }
    const ann = annotations[pheno.phenocode]
    if (!ann) {
	console.error(`No name for phenocode: ${pheno.phenocode}, skipping`)
	return null
    }
    pheno.phenostring = ann.name
    if (ann.nCases) pheno.num_cases = ann.nCases
    if (ann.nCtrls) pheno.num_controls = ann.nCtrls
    return pheno
    
}).filter(pheno => !!pheno)

console.log(JSON.stringify(phenolist, null, 4))
