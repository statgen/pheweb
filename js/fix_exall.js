const fs = require('fs')
    
var phenolist = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
console.error(`${phenolist.length} phenotypes`)

    phenomap = phenolist.reduce((acc, cur) => {
	    acc[cur.phenocode] = cur
	    return acc
}, {})

phenolist = phenolist.map(pheno => {
	if (pheno.phenostring == pheno.phenocode) {
	    const name = pheno.phenocode.replace(/_EX[A-Z]+/, '')
	    if (phenomap[name]) {
		if (pheno.phenocode.endsWith('_EXALLC')) {
		    pheno.phenostring = phenomap[name].phenostring + ' (ICD C excluded)'
		} else if (pheno.phenocode.endsWith('_EXMORE')) {
		    pheno.phenostring = phenomap[name].phenostring + ' (more excluded)'
		} else if (name == 'ASTHMA_OPPORTUNIST_INFECTIONS') {
		    pheno.phenostring = 'Asthma opportunist infections'
		}
	    } else if (pheno.phenocode == 'C3_OTHER_SKIN_EXALLC') {
		pheno.phenostring = 'Other skin (ICD C excluded)'
	    } else {
		console.error('check ' + pheno.phenostring)
	    }
	}
	return pheno
})

console.log(JSON.stringify(phenolist, null, 4))
