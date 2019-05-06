//// AD-HOC FINNGEN ENDPOINT HTML PARSER
//// CONVERTS ENDPOINT HTML PAGES TO TEXTUAL ENDPOINT DESCRIPTIONS
//// ERROR-PRONE DO NOT USE
//// ASSUMES THE FORMAT OF www.helsinki.fi/~ahavulin/endpointtest HTML PAGES VERSION Created by: Aki Havulinna, Tuomo Kiiskinen on 2018-12-04 21:35:41
//// ANY CHANGES TO THE HTML WILL BREAK THIS SCRIPT
//// MADE WITH LOVE

//// LOGS: descriptions_error.log, descriptions_combined.log

const fs = require('fs')
const winston = require('winston')

const get_custom_condition = function(pheno_hash, pheno, haystack) {

    var arr = haystack.split('&')
    var cond = []

    arr.forEach(str => {
        str = str.replace(')', '').replace('(', '')
        if (pheno_hash[str]) {
            cond.push(pheno_hash[str])
        } else if (str.indexOf('!') == 0) {
            var phenocode = pheno_hash[str.slice(1)]
            if (phenocode) cond.push('!' + phenocode)
            else logger.error(`${pheno.phenocode}\tUnexpected condition:\t${str} (full logic: ${haystack})`)
        }
        var age = str.match(/BL_AGE>[=]?([0-9]+)/)
        if (age) cond.push(`older than ${age[1]} at baseline`)
        age = str.match(/EVENT_AGE>[=]?([0-9]+)/)
        if (age) cond.push(`older than ${age[1]} at first event or record`)
        age = str.match(/BL_AGE<[=]?([0-9]+)/)
        if (age) cond.push(`younger than ${age[1]} at baseline`)
        age = str.match(/EVENT_AGE<[=]?([0-9]+)/)
        if (age) cond.push(`younger than ${age[1]} at first event or record`)
    })
    return cond
}

const desc_html = function(p) {

    if (p.no_description) {
        return '<span>No description available</span>'
    }
    var description = []
    if (p.cond_pre.length > 0) {
        description = description.concat(p.cond_pre.map(cond => cond.indexOf(' than ') > -1 ?
        `<span>Only individuals ${cond.replace(' or record', '')} are included.<br/></span>` :
        cond.startsWith('!') ?
        `<span>Only individuals without ${cond.slice(1)} are included.<br/></span>` :
        `<span>Only individuals with ${cond} are included.<br/></span>`))
    }
    if (p.cond_prim.length > 0) {
        description = description.concat(p.cond_prim.map(cond => cond.indexOf(' than ') > -1 ?
        `<span>Only individuals ${cond.replace(' or record', '')} are included.<br/></span>` :
        cond.startsWith('!') ?
        `<span>Only individuals without ${cond.slice(1)} are included.<br/></span>` :
        `<span>Only individuals with ${cond} are included.<br/></span>`))
    }
    if (p.cond_sec.length > 0) {
        description = description.concat(p.cond_sec.map(cond => cond.indexOf(' than ') > -1 ?
        `<span>Only individuals ${cond.replace(' or record', '')} are included.<br/></span>` :
        cond.startsWith('!') ?
        `<span>Only individuals without ${cond.slice(1)} are included.<br/></span>` :
        `<span>Only individuals with ${cond} are included.<br/></span>`))
    }
    if (description.length > 0) {
        //description.push('<br meta="1"/>')
    }
    if (p.incl.filter(x => !!x).length > 0) {
        description.push(`<span>Includes endpoints: ${p.incl.filter(x => !!x).join(', ')}<br/></span>`)
    }
    if (p.icd_incl.length > 0) {
        description.push(`<span>Includes ICD-10 codes: ${p.icd_incl.join(', ')}<br/></span>`)
    }
    if (p.icd_excl.length > 0) {
        description.push(`<span>Excludes ICD-10 codes: ${p.icd_excl.join(', ')}<br/></span>`)
    }
    if (p.cancer.length > 0) {
        description.push(`<span>Includes cancer registry data for ${p.cancer.join(',')}<br/></span>`)
    }
    if (p.kela.length > 0) {
        description.push(`<span>Includes medication for ${p.kela.join(',')}<br/></span>`)
    }
    if (p.oper.length > 0) {
        description.push(`<span>Includes operation codes: ${p.oper.join(',')}<br/></span>`)
    }
    if (description.length > 0) {
        //description.push('<br meta="2"/>')
    }
    if (p.excl.length > 0) {
        description.push(`<span>Control exclusion: ${p.excl.join(',')}</span>`)
    }
    return description.filter((item, pos) => description.indexOf(item) == pos).join('')
}

if (fs.existsSync('descriptions_error.log')) fs.unlinkSync('descriptions_error.log')
if (fs.existsSync('descriptions_combined.log')) fs.unlinkSync('descriptions_combined.log')

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    transports: [
	new winston.transports.File({ filename: 'descriptions_error.log', level: 'error' }),
	new winston.transports.File({ filename: 'descriptions_combined.log' })
    ]
})

module.exports = function(phenolist, config) {

    const pheno_hash = fs.readFileSync(config.phenoname, 'utf8').trim().split(/\r?\n|\r/)
	  .reduce((acc, line) => {
	      var split = line.split('\t')
	      acc[split[3]] = split[4]
	      return acc
	  }, {})

    const nomesco = fs.readFileSync(config.nomesco, 'utf8').trim().split(/\r?\n|\r/)
	  .reduce((acc, line) => {
	      const s = line.split(/\t/)
	      acc[s[0].trim()] = s[22].trim()
	      return acc
	  }, {})
    
    return phenolist.map(pheno => {

	const orig_code = pheno.phenocode
	pheno.phenocode = pheno.phenocode.replace('_EXMORE', '').replace('_EXALLC', '')

	if (!fs.existsSync(`${config.html}/${pheno.phenocode}.html`)) {
            logger.error(`HTML for pheno ${pheno.phenocode} does not exist`)
            pheno.no_description = true
	    pheno.phenocode = orig_code
            return pheno
	}

	const html = fs.readFileSync(`${config.html}/${pheno.phenocode}.html`, {encoding: 'utf8'}).trim().split(/\r?\n|\r/)

	var cond_pre = []
	var cond_prim = []
	var cond_sec = []
	var incl = []
	var excl = []
	var icd_incl = []
	var icd_excl = []
	var kela = []
	var cancer = []
	var oper = []

	for (let i = 0; i < html.length; i++) {
            var line = html[i].trim()
            if (line.startsWith('<p>Preconditions:')) {
		cond_pre = get_custom_condition(pheno_hash, pheno, line.replace('<p>Preconditions:', ''))
		logger.debug(`${pheno.phenocode}\t Precondition:\t${cond_pre}`)
            }
            if (line.startsWith('<p>Conditions:')) {
		cond_sec = line.replace('<p>Conditions:', '').replace(')', '').replace('(', '').trim().split('&').map(c => c.startsWith('!') ? '!' + pheno_hash[c.slice(1)] : pheno_hash[c])
		if (cond_sec.length != cond_sec.filter(c => !!c).length) logger.error(`${pheno.phenocode}\tUnexpected conditions (perhaps an unknown phenotype code):\t${line}`)
		logger.debug(`${pheno.phenocode}\t Condition:\t${cond_sec}`)
            } else if (line.startsWith('<p>Includes:')) {
		line = html[++i].trim()
		incl = line.replace('<p>', '').split(', ').map(p => pheno_hash[p.match(/<a href="(.*)">(.*)<\/a>/)[2]])
		if (incl.length != incl.filter(i => !!i).length) logger.error(`${pheno.phenocode}\tUnexpected inclusion:\t${line}`)
            } else if (line.startsWith('<table')) {
		line = html[++i].trim()
		line = html[++i].trim()
		if (html[i-3].trim().startsWith('<h1')) { // exclusions and conditions
                    while (line && !line.startsWith('</table')) {
			var m = line.match(/<tr><td>(.*)<\/td><td>(.*)<\/td><td>(.*)<\/td>/)
			if (m && m[1] == orig_code) { // has conditions
                            var href = m[3].match(/<a href="(.*)">(.*)<\/a>/)
                            if (href) {
				var phenocode = href[2].replace(/\[.*\]/, '').trim()
				if (pheno_hash[phenocode]) cond_prim.push(pheno_hash[phenocode])
				else logger.error(`${pheno.phenocode}\tUnexpected condition phenotype code:\t${phenocode}`)
                            } else {
				cond_prim = cond_prim.concat(get_custom_condition(pheno_hash, pheno, m[3])).filter(e => !!e)
				logger.debug(`${pheno.phenocode}\tSpecial condition:\t${m[3]}\t${cond_prim}`)
                            }
			} else {
                            m = line.match(/<tr><td>(.*)<\/td><td>(.*)<\/td>/)
			}
			if (m && m[1] == orig_code && m[2] != '&lt;CASES&gt;') { // has exclusions
                            var href = m[2].match(/<a href="(.*)">(.*)<\/a>/)
                            if (href) {
				var phenocode = href[2].replace(/\[.*\]/, '').trim()
				if (pheno_hash[phenocode]) excl.push(pheno_hash[phenocode])
				else logger.error(`${pheno.phenocode}\tUnexpected exclusion phenotype code:\t${phenocode}`)
                            } else {
				logger.error(`${pheno.phenocode}\tUnexpected exclusion:\t${m[2]}`)
                            }
			} else if (!m) logger.error(`${pheno.phenocode}\tUnexpected line:\t${line}`)
			line = html[++i].trim()
                    }
		} else if (html[i-3].trim().startsWith('<h3')) { // definitions
                    var header = html[i-1].trim()
                    while (line && !line.startsWith('</table') && line != '</div>') {
			if (header.startsWith('<tr><th>ICD-10</th>')) {
                            var m = line.match(/<span class="tooltiptext">(.*)<\/span>/)
                            if (m) icd_incl = icd_incl.concat(m[1].split('<br>'))
                            else logger.error(`${pheno.phenocode}\tExpected ICD-10 inclusion tooltip, found none:\t${line}`)
                            if (html[i+2].startsWith('; !(')) {
				var m2 = html[i+2].match(/<span class="tooltiptext">(.*)<\/span>/)
				if (m2) icd_excl = icd_excl.concat(m2[1].split('<br>'))
				else logger.error(`${pheno.phenocode}\tExpected ICD-10 exclusion tooltip, found none:\t${html[i+2]}`)
                            }
			} else if (header.startsWith('<tr><th>REIMBURSEMENT</th>')) {
                            var m = line.match(/<span class="tooltiptext">(.*)<\/span>/)
                            var cause = html[i+2].replace('</td><td>', '').replace('</td></tr>', '')
                            var m_cause = cause.match(/<div class="tooltip">(.*)<span/)
                            if (m_cause) cause = m_cause[1]
                            if (m) kela = kela.concat((m[1] == 'NA' ? 'Any' : m[1]) + (cause == 'NA' ? '' : ` (${cause.trim()})`))
                            else logger.error(`${pheno.phenocode}\tExpected KELA tooltip, found none:\t${line}`)
			} else if (header.startsWith('<tr><th>TOPOGRAPHY</th>')) {
                            var m = line.match(/<span class="tooltiptext">(.*)<\/span>/)
                            if (m) cancer = cancer.concat(m[1].split('<br>'))
                            else logger.error(`${pheno.phenocode}\tExpected CANCER tooltip, found none:\t${line}`)
			} else if (header.startsWith('<caption>Operation codes (Hilmo)</caption>')) {
                            var hm = header.match(/<tr><th>(.*)<\/th><th>(.*)<\/th><th>(.*)<\/th><th>(.*)<\/th><\/tr>/)
                            if (!hm) logger.error(`${pheno.phenocode}\tUnexpected operation code line:\t${header}`)
                            var m = line.match(/<tr><td>(.*)<\/td><td>(.*)<\/td><td>(.*)<\/td><td>(.*)<\/td><\/tr>/)
                            if (m) oper = oper.concat(m.slice(1).map((o, i) => o == 'NA' ? null : `${hm[i+1]}: ${o}`).filter(o => !!o))
                            else logger.error(`${pheno.phenocode}\tUnexpected operation code line:\t${line}`)
			} else {
                            logger.error(`${pheno.phenocode}\tUnexpected definition header:\t${header}`)
			}
			line = html[++i].trim()
                    }
		}
            }
	}

	pheno.phenocode = orig_code
	pheno.cond_pre = cond_pre
	pheno.cond_prim = cond_prim
	pheno.cond_sec = cond_sec
	pheno.incl = incl
	pheno.excl = excl
	pheno.icd_incl = icd_incl
	pheno.icd_excl = icd_excl
	pheno.kela = kela
	pheno.cancer = cancer
	pheno.oper = oper
        pheno.oper = pheno.oper.map(o => {
	    if (o.indexOf('Nomesco: ') > -1) {
                o = (o.replace('Nomesco: ', '').split('|').map(code => nomesco[code] || code)).join(', ')
	    }
	    return `Nomesco: ${o}`
        })
	pheno.desc_url = `/static/endpoints/${pheno.phenocode.replace('_EXMORE', '').replace('_EXALLC')}.html`
	pheno.desc_html = desc_html(pheno)

	return pheno
    })
}
