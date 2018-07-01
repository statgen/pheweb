#!/usr/bin/env node

//// add lambdas and numbers of gw hits from the qq plot and manhattan json files to a phenolist

const path = require('path')
const fs = require('fs')

if (process.argv.length !== 3) {
    console.error(`Usage: node ${__filename} phenolistfile`)
    process.exit(1)
}

const annotations = {}
const phenolist = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
phenolist.forEach(pheno => {
    qq = JSON.parse(fs.readFileSync(path.dirname(process.argv[2]) + '/generated-by-pheweb/qq/' + pheno.phenocode + '.json', 'utf8'))
    manhattan = JSON.parse(fs.readFileSync(path.dirname(process.argv[2]) + '/generated-by-pheweb/manhattan/' + pheno.phenocode + '.json', 'utf8'))
    pheno.num_gw_significant = manhattan.unbinned_variants.filter(v => v.peak && v.pval < 5e-8).length
    pheno.gc_lambda = qq.overall.gc_lambda
})

console.log(JSON.stringify(phenolist, null, 4))
