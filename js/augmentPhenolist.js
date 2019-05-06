#!/usr/bin/env node

//// Augments a pheno-list.json for PheWeb with annotations
//// logs to pheno-list.log and writes new pheno-list.json to stdout

if (process.argv.length !== 3) {
    console.error(`Usage: node ${__filename} config_file`)
    process.exit(1)
}

const fs = require('fs')
const path = require('path')
const winston = require('winston')
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const parse_endpoints = require('./parse_endpoints.js')

if (fs.existsSync('pheno-list.log')) fs.unlinkSync('pheno-list.log')
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    transports: [
	new winston.transports.File({ filename: 'pheno-list.log' })
    ]
})

var phenolist = JSON.parse(fs.readFileSync(config.phenolist, 'utf8'))

// read phenotype names from phenotype excel
const annotations = fs.readFileSync(config.phenoname, 'utf8').trim().split(/\r?\n|\r/)
      .reduce((acc, cur) => {
	  const split = cur.split(/\t/)
	  acc[split[3].trim()] = {
	      code: split[3].trim(),
	      name: split[4].trim(),
	      nCases: 0,
	      nCtrls: 0
	  }
	  return acc
      }, {})

// read ICD categories
const categories = fs.readFileSync(config.category, 'utf8').trim().split(/\r?\n|\r/)
      .reduce((acc, cur) => {
	  const split = cur.split(/\t/)
	  acc[split[0].trim()] = {
	      code: split[0].trim(),
	      name: split[1].trim()
	  }
	  return acc
      }, {})

logger.info(`${phenolist.length} phenotypes, ${Object.keys(annotations).length} phenotypes\' annotations and ${Object.keys(categories).length} categories read`)

// read numbers of cases and controls from data file
const lines = fs.readFileSync(config.pheno, 'utf8').trim().split(/\r?\n|\r/)
const fields = lines[0].split(/\t/)
lines.slice(1).forEach(line => {
    const split = line.split(/\t/)
    split.forEach((value, i) => {
        if (!annotations[fields[i]]) {
	    var code = fields[i]
	    var name = ''
	    if (annotations[code.replace(/_EX[A-Z]+/, '')]) {
		name = annotations[code.replace(/_EX[A-Z]+/, '')].name
	    }
            annotations[fields[i]] = {
                code: code,
                name: name,
                nCases: 0,
                nCtrls: 0
            }
        }
	if (value == '0') annotations[fields[i]].nCtrls++
	if (value == '1') annotations[fields[i]].nCases++
    })
})

// give names, categories and n cases/controls to phenotypes in phenolist
phenolist = phenolist.map(pheno => {
    const m = pheno.phenocode.match(/([A-Z0-9]+)_(.*)/)
    if (!m) {
	logger.info(`No-category phenocode: ${pheno.phenocode}, using 'Other'`)
	pheno.category = 'Other'
    } else {
	var cat = categories[m[1]]
	if (!cat) {
	    logger.info(`Unexpected 'category': ${m[1]}, using 'Other'`)
	    pheno.category = 'Other'
	} else {
	    pheno.category = cat.name
	}
    }
    const ann = annotations[pheno.phenocode]
    if (!ann) {
	logger.error(`Phenocode ${pheno.phenocode} in phenolist doesnt appear in annotation file or data file, quitting!`)
	console.error(`Phenocode ${pheno.phenocode} in phenolist doesnt appear in annotation file or data file, quitting!`)
	process.exit(1)
    }
    pheno.phenostring = ann.name
    pheno.num_cases = ann.nCases
    pheno.num_controls = ann.nCtrls
    return pheno
    
})

phenolist.forEach(pheno => {
    if (!pheno.phenostring) {
	logger.warn(`Check: no name for ${pheno.phenocode}, using phenocode`)
	pheno.phenostring = pheno.phenocode
    }
})

// add num gw significant hits and lambdas
phenolist.forEach(pheno => {
    qq = JSON.parse(fs.readFileSync(path.dirname(config.phenolist) + '/generated-by-pheweb/qq/' + pheno.phenocode + '.json', 'utf8'))
    manhattan = JSON.parse(fs.readFileSync(path.dirname(config.phenolist) + '/generated-by-pheweb/manhattan/' + pheno.phenocode + '.json', 'utf8'))
    pheno.num_gw_significant = manhattan.unbinned_variants.filter(v => v.peak && v.pval < 5e-8).length
    pheno.gc_lambda = qq.overall.gc_lambda
})

// add pheno descriptions from html pages
if (config.html) {
    phenolist = parse_endpoints(phenolist, config)
}

console.log(JSON.stringify(phenolist, null, 4))
