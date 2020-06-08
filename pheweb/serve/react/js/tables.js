import React from 'react'
import matchSorter from 'match-sorter'

const maxTableWidth = 1600

const variantSorter = (a, b) => {
    const v1 = a.split(':').map(e => +e)
    const v2 = b.split(':').map(e => +e)
    if (v1[0] != v2[0]) return v1[0] > v2[0] ? 1 : -1
    return v1[1] > v2[1] ? 1 : -1
}

const naSorter = (a, b) => {
    a=+a; b=+b
    if (isNaN(a)) {
	if (isNaN(b)) {
	    return 0
	}
	return 1
    }
    if (isNaN(b)) {
	return -1
    }
    return a - b
}

const naSmallSorter = (a, b) => {
    a=+a; b=+b
    if (isNaN(a)) {
	if (isNaN(b)) {
	    return 0
	}
	return -1
    }
    if (isNaN(b)) {
	return 1
    }
    return a - b
}

const stringToCountSorter = (a,b) => {
    const c  =a.split(";").filter(x=> x != 'NA').length
    const d = b.split(";").filter(x=> x != 'NA').length
    return d - c
}

const tofixed = (v,n) => {
    return typeof(v) == typeof(0) ? v.toFixed(n) : v
}

const truncateString = (s,l) => {
    return s.split(";").length > l ? s.split(";").slice(0,l).join(";")+"...": s
}

const regionBuilder = (s,r) => {
    const tmp = s.replace("chr23","chrX").replace("chr","").split("_")
    const chr=tmp[0]
    const pos_min=Math.max( parseInt( tmp[1] ) - r,1 ) //pos starts from 1
    const pos_max=parseInt( tmp[1] ) + r
    return `${chr}:${pos_min}-${pos_max}`
}

const phenolistTableCols = {'FINNGEN': [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>phenotype</span>),
    accessor: 'phenostring',
    Cell: props => (<a href={"/pheno/" + props.original.phenocode} target="_blank">{props.value}</a>),
    minWidth: 300
}, {
    Header: () => (<span title="Risteys link" style={{textDecoration: 'underline'}}>Risteys</span>),
    accessor: 'phenocode',
    Cell: props => (<a style={{fontSize:'1.25rem', padding: '.25rem .5rem', backgroundColor: '#2779bd', color: '#fff', borderRadius: '.25rem', fontWeight: '700', boxShadow: '0 0 5px rgba(0,0,0,.5)'}} href={'https://risteys.finngen.fi/phenocode/' + props.value.replace('_EXALLC', '').replace('_EXMORE', '')}>RISTEYS</a>),
    Filter: ({ filter, onChange }) => null,
    minWidth: 50
}, {
    Header: () => (<span title="phenotype category" style={{textDecoration: 'underline'}}>category</span>),
    accessor: 'category',
    Cell: props => props.value,
    minWidth: 200
},{
    Header: () => (<span title="number of cases" style={{textDecoration: 'underline'}}>number of cases</span>),
    accessor: 'num_cases',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50,
},{
    Header: () => (<span title={`number of cases ${window.release_prev}`} style={{textDecoration: 'underline'}}>{`number of cases ${window.release_prev}`}</span>),
    accessor: 'num_cases_prev',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50,
},{
    Header: () => (<span title="number of controls" style={{textDecoration: 'underline'}}>number of controls</span>),
    accessor: 'num_controls',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50,
},{
    Header: () => (<span title="number of genome-wide significant hits" style={{textDecoration: 'underline'}}>genome-wide sig loci</span>),
    accessor: 'num_gw_significant',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50,
},{
    Header: () => (<span title={`number of genome-wide significant hits ${window.release_prev}`} style={{textDecoration: 'underline'}}>{`genome-wide sig loci ${window.release_prev}`}</span>),
    accessor: 'num_gw_significant_prev',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50,
},{
    Header: () => (<span title="genomic control lambda 0.5" style={{textDecoration: 'underline'}}>genomic control lambda</span>),
    accessor: 'lambda',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50,
}], 'FINNGEN_QUANT': [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>phenotype</span>),
    accessor: 'phenostring',
    Cell: props => (<a href={"/pheno/" + props.original.phenocode} target="_blank">{props.value}</a>),
    minWidth: 200
}, {
    Header: () => (<span title="ATC code" style={{textDecoration: 'underline'}}>ATC code</span>),
    accessor: 'atc',
    Cell: props => (<a href={"https://www.whocc.no/atc_ddd_index/?code=" + props.value} target="_blank">{props.value}</a>),
    minWidth: 200
},{
    Header: () => (<span title="number of samples" style={{textDecoration: 'underline'}}>number of individuals with >0 purchases</span>),
    accessor: 'num_samples',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 100,
},{
    Header: () => (<span title="number of purchases" style={{textDecoration: 'underline'}}>number of purchases</span>),
    accessor: 'num_events',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 100,
},{
    Header: () => (<span title="number of genome-wide significant hits" style={{textDecoration: 'underline'}}>genome-wide sig loci</span>),
    accessor: 'num_gw_significant',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 100,
},{
    Header: () => (<span title="genomic control lambda 0.5" style={{textDecoration: 'underline'}}>genomic control lambda</span>),
    accessor: 'lambda',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 100,
}], 'GBMA': [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>phenotype</span>),
    accessor: 'phenostring',
    Cell: props => (<a href={"/pheno/" + props.original.phenocode} target="_blank">{props.value}</a>),
    minWidth: 300
},{
    Header: () => (<span title="number of cases" style={{textDecoration: 'underline'}}>number of cases</span>),
    accessor: 'num_cases',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50,
},{
    Header: () => (<span title="number of controls" style={{textDecoration: 'underline'}}>number of controls</span>),
    accessor: 'num_controls',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50,
},{
    Header: () => (<span title="number of genome-wide significant hits" style={{textDecoration: 'underline'}}>genome-wide sig loci</span>),
    accessor: 'num_gw_significant',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50,
},{
    Header: () => (<span title="genomic control lambda 0.5" style={{textDecoration: 'underline'}}>genomic control lambda</span>),
    accessor: 'lambda',
    Cell: props => props.value,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50
},{
    Header: () => (<span title="number of cohorts" style={{textDecoration: 'underline'}}>n cohorts</span>),
    accessor: 'cohorts',
    Cell: props => +props.value.length,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    minWidth: 50
}]}

const phenoTableCommonCols = [[{
    Header: () => (<span title="chromosome" style={{textDecoration: 'underline'}}>chr</span>),
    accessor: 'chrom',
    Cell: props => <span style={{float: 'right', paddingRight: '10px'}}>{props.value}</span>,
    filterMethod: (filter, row) => row[filter.id] == filter.value,
    minWidth: 40
}, {
    Header: () => (<span title="position in build 38" style={{textDecoration: 'underline'}}>pos</span>),
    accessor: 'pos',
    Cell: props => (<a href={`/variant/${props.original.chrom}-${props.original.pos}-${props.original.ref}-${props.original.alt}`}>{props.value}</a>),
    filterMethod: (filter, row) => {
	const s = filter.value.split('-').map(val => +val)
	if (s.length == 1) return row[filter.id] == filter.value
	else if (s.length == 2) return row[filter.id] > s[0] && row[filter.id] < s[1]
    },
    minWidth: 100,
}, {
    Header: () => (<span title="reference allele" style={{textDecoration: 'underline'}}>ref</span>),
    accessor: 'ref',
    Cell: props => props.value,
    minWidth: 50
}, {
    Header: () => (<span title="alternative allele" style={{textDecoration: 'underline'}}>alt</span>),
    accessor: 'alt',
    Cell: props => props.value,
    minWidth: 50
}, {
    Header: () => (<span title="LocusZoom plot for the region" style={{textDecoration: 'underline'}}>locus</span>),
    accessor: 'pos',
    Cell: props => <a href={`/region/${props.original.phenocode}/${props.original.chrom}:${Math.max(props.original.pos-200*1000, 0)}-${props.original.pos+200*1000}`}>locus</a>,
    Filter: ({ filter, onChange }) => null,
    minWidth: 50
}, {
    Header: () => (<span title="rsid(s)" style={{textDecoration: 'underline'}}>rsid</span>),
    accessor: 'rsids',
    Cell: props => (<a href={`/variant/${props.original.chrom}-${props.original.pos}-${props.original.ref}-${props.original.alt}`}>{props.value}</a>),
    minWidth: 110
}, {
    Header: () => (<span title="nearest gene(s)" style={{textDecoration: 'underline'}}>nearest gene</span>),
    accessor: 'nearest_genes',
    Cell: props => (<a href={`/gene/${props.value}`}>{props.value}</a>),
    minWidth: 110
}, {
    Header: () => (<span title="VEP consequence" style={{textDecoration: 'underline'}}>consequence</span>),
    accessor: 'most_severe',
    Cell: props => props.value,
    minWidth: 180
}], [{
    Header: () => (<span title="odds ratio" style={{textDecoration: 'underline'}}>OR</span>),
    accessor: 'beta',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > +filter.value,
    Cell: props => Math.exp(props.value).toFixed(2),
    minWidth: 80
}, {
    Header: () => (<span title="p-value" style={{textDecoration: 'underline'}}>p-value</span>),
    accessor: 'pval',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => props.value.toExponential(1),
    minWidth: 80
}]]

const phenoTableCols = {'GBMA': [...phenoTableCommonCols[0], ...phenoTableCommonCols[1], {
    Header: () => (<span title="allele frequency in UKBB" style={{textDecoration: 'underline'}}>af ukbb</span>),
    accessor: 'maf',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => (props.value == 'NA' || props.value == '') ? 'NA' : props.value.toPrecision(3),
    minWidth: 110
}, {
    Header: () => (<span title="number of cohorts" style={{textDecoration: 'underline'}}>n cohorts</span>),
    accessor: 'n_cohorts',
    filterMethod: (filter, row) => row[filter.id] >= +filter.value,
    Cell: props => +props.value,
    minWidth: 80
}],
			'FINNGEN': [...phenoTableCommonCols[0],{
    Header: () => (<span title="INFO score" style={{textDecoration: 'underline'}}>INFO</span>),
    accessor: 'info',
    filterMethod: (filter, row) => row[filter.id] >= +filter.value,
    Cell: props => isNaN(+props.value) ? 'NA' : props.value.toPrecision(3),
    minWidth: 80
}, {
    Header: () => (<span title="AF enrichment FIN / Non-Finnish-non-Estonian European" style={{textDecoration: 'underline'}}>FIN enrichment</span>),
    accessor: 'fin_enrichment',
    filterMethod: (filter, row) => row[filter.id] > +filter.value,
    Cell: props => {
	return isNaN(+props.value) ? '' :
	    <div style={{color: +props.value > 5 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    {props.value == 1e6 ? 'inf' : props.value == -1 ? 'NA' : Number(props.value).toPrecision(3)}
	</div>
    },
    minWidth: 120
}, {
    Header: () => (<span title="allele frequency" style={{textDecoration: 'underline'}}>af</span>),
    accessor: 'maf',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => props.value.toPrecision(3),
    minWidth: 110
}, {
    Header: () => (<span title="allele frequency in cases" style={{textDecoration: 'underline'}}>af cases</span>),
    accessor: 'maf_cases',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => props.value.toPrecision(3),
    minWidth: 110
}, {
    Header: () => (<span title="allele frequency in controls" style={{textDecoration: 'underline'}}>af controls</span>),
    accessor: 'maf_controls',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => props.value.toPrecision(3),
    minWidth: 110
}, ...phenoTableCommonCols[1],
{
    Header: () => (<span title="UKBB Neale lab result" style={{textDecoration: 'underline'}}>UKBB</span>),
    accessor: 'UKBB',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => props.original.ukbb ? <div>{(Number(props.original.ukbb.beta) >= 0) ? <span style={{color: 'green', float: 'left', paddingRight: '5px'}} className="glyphicon glyphicon-triangle-top" aria-hidden="true"></span> :
					       (Number(props.original.ukbb.beta) < 0) ? <span style={{color: 'red', float: 'left', paddingRight: '5px'}} className="glyphicon glyphicon-triangle-bottom" aria-hidden="true"></span> :
					       <span></span>} {Number(props.original.ukbb.pval).toExponential(1)}</div> : 'NA',
    minWidth: 110
}],
'FINNGEN_QUANT': [...phenoTableCommonCols[0],{
    Header: () => (<span title="INFO score in FinnGen" style={{textDecoration: 'underline'}}>INFO FG</span>),
    accessor: 'info',
    filterMethod: (filter, row) => row[filter.id] >= +filter.value,
    Cell: props => isNaN(+props.value) ? 'NA' : props.value.toPrecision(3),
    minWidth: 80
}, {
    Header: () => (<span title="AF enrichment FIN / Non-Finnish-non-Estonian European" style={{textDecoration: 'underline'}}>FIN enrichment</span>),
    accessor: 'fin_enrichment',
    filterMethod: (filter, row) => row[filter.id] > +filter.value,
    Cell: props => {
	return isNaN(+props.value) ? '' :
	    <div style={{color: +props.value > 5 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    {props.value == 1e6 ? 'inf' : props.value == -1 ? 'NA' : Number(props.value).toPrecision(3)}
	</div>
    },
    minWidth: 120
}, {
    Header: () => (<span title="allele frequency" style={{textDecoration: 'underline'}}>af</span>),
    accessor: 'maf',
    filterMethod: (filter, row) => {
	return filter.value.startsWith('>') ?
	    row[filter.id] > +(filter.value.substring(1)) :
	    row[filter.id] < +(filter.value.replace('<', ''))
    },
    Cell: props => props.value.toPrecision(3),
    minWidth: 110
}, ...phenoTableCommonCols[1]],			
    'FINNGEN_UKB': [...phenoTableCommonCols[0],{
    Header: () => (<span title="INFO score in FinnGen" style={{textDecoration: 'underline'}}>INFO FG</span>),
    accessor: 'info',
    filterMethod: (filter, row) => row[filter.id] >= +filter.value,
    Cell: props => isNaN(+props.value) ? 'NA' : props.value.toPrecision(3),
    minWidth: 80
}, {
    Header: () => (<span title="AF enrichment FIN / Non-Finnish-non-Estonian European" style={{textDecoration: 'underline'}}>FIN enrichment</span>),
    accessor: 'fin_enrichment',
    filterMethod: (filter, row) => row[filter.id] > +filter.value,
    Cell: props => {
	return isNaN(+props.value) ? '' :
	    <div style={{color: +props.value > 5 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    {props.value == 1e6 ? 'inf' : props.value == -1 ? 'NA' : Number(props.value).toPrecision(3)}
	</div>
    },
    minWidth: 120
}, {
    Header: () => (<span title="allele frequency in UKBB" style={{textDecoration: 'underline'}}>af UKBB</span>),
    accessor: 'maf',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => props.value.toPrecision(3),
    minWidth: 110
}, {
    Header: () => (<span title="allele frequency in FinnGen cases" style={{textDecoration: 'underline'}}>af cases FG</span>),
    accessor: 'maf_cases',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => props.value.toPrecision(3),
    minWidth: 110
}, {
    Header: () => (<span title="allele frequency in FinnGen controls" style={{textDecoration: 'underline'}}>af controls FG</span>),
    accessor: 'maf_controls',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => props.value.toPrecision(3),
    minWidth: 110
}, ...phenoTableCommonCols[1]]}

const csTableCols = [{
    Header: () => (<span title="variant with highest PIP in the credible set" style={{textDecoration: 'underline'}}>top PIP variant</span>),
    accessor: 'locus_id',
    Cell: props => (<a href={"/region/" + props.original.phenocode+"/"+regionBuilder(props.value,250000)} target="_blank">{props.value.replace("chr","").replace(/_/g,":")}</a>),
    //width: Math.min(270, 270/maxTableWidth*window.innerWidth),
    minWidth: 60,
}, {
    Header: () => (<span title="chromosome" style={{textDecoration: 'underline'}}>chromosome</span>),
    accessor: 'chr',
    Cell: props => props.value,
    minWidth: 50,
}, {
    Header: () => (<span title="p-value" style={{textDecoration: 'underline'}}>p-value</span>),
    accessor: 'lead_pval',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => props.value.toExponential(1),
    minWidth: 50,
}, {
    Header: () => (<span title="effect size (beta)" style={{textDecoration: 'underline'}}>effect size (beta)</span>),
    accessor: 'lead_beta',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => tofixed(props.value,3),
    minWidth: 50,
}, {
    Header: () => (<span title="Finnish Enrichment" style={{textDecoration: 'underline'}}>Finnish Enrichment</span>),
    accessor: 'enrichment',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => tofixed(props.value,3),
    minWidth: 50,
},{
    Header: () => (<span title="Minor allele frequency" style={{textDecoration: 'underline'}}>MAF</span>),
    accessor: 'lead_AF',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => tofixed(props.value,3),
    minWidth: 50,
},{
    Header: () => (<span title="Lead Variant Gene" style={{textDecoration: 'underline'}}>Lead Variant Gene</span>),
    accessor: 'most_severe_gene',
    Cell: props => props.value != "NA" ? (<a href={"/gene/" + props.value} target="_blank">{props.value}</a>):"NA",
    minWidth: 50,
}, {
    Header: () => (<span title="number of coding variants in the credible set" style={{textDecoration: 'underline'}}># coding in cs</span>),
    accessor: 'functional_variants_strict',
    sortMethod: stringToCountSorter,
    Cell: props => <div><span title={truncateString(props.value,4)}>{props.value.split(";").filter(x=>x!=="NA").length}</span></div>,
    minWidth: 40
}, {
    Header: () => (<span title="# Credible set variants" style={{textDecoration: 'underline'}}># credible variants</span>),
    accessor: 'credible_set_variants',
    sortMethod: stringToCountSorter,
    Cell: props => <div><span title={truncateString(props.value,4)}>{props.value.split(";").filter(x=>x!=="NA").length}</span></div>,
    minWidth: 50,
}, {
    Header: () => (<span title="CS matching Traits" style={{textDecoration: 'underline'}}>CS matching Traits</span>),
    accessor: 'all_traits_strict',
    sortMethod: stringToCountSorter,
    Cell: props => <div><span title={props.value}>{props.value.split(";").filter(x=>x!=="NA").length}</span></div>,
    minWidth: 100,
}, {
    Header: () => (<span title="LD Partner matching Traits" style={{textDecoration: 'underline'}}>LD Partner Traits</span>),
    accessor: 'all_traits_relaxed',
    sortMethod: stringToCountSorter,
    Cell: props => <div><span title={props.value}>{props.value.split(";").filter(x=>x!=="NA").length}</span></div>,
    minWidth: 100,
}, {
    Header: () => (<span title="UKBB Neale lab result" style={{textDecoration: 'underline'}}>UKBB</span>),
    accessor: 'ukbb_pval',
    sortMethod: naSorter,
    Cell: props => props.value != "NA" ? <div>{(Number(props.original.ukbb_beta) >= 0) ? <span style={{color: 'green', float: 'left', paddingRight: '5px'}} className="glyphicon glyphicon-triangle-top" aria-hidden="true"></span> :
					       (Number(props.original.ukbb_beta) < 0) ? <span style={{color: 'red', float: 'left', paddingRight: '5px'}} className="glyphicon glyphicon-triangle-bottom" aria-hidden="true"></span> :
					       <span></span>} {Number(props.value).toExponential(1)}</div> : props.value,
    minWidth: 100,
}

]

const csInsideTableCols = [
//{Header: () => (<span title="Group ID" style={{textDecoration: 'underline'}}>Group ID</span>),
//accessor: 'locus_id',
//Cell: props => props.value,
//minWidth: 60,
//}, 
{Header: () => (<span title="Variant ID" style={{textDecoration: 'underline'}}>Variant ID</span>),
accessor: 'variant',
Cell: props => (<a href={"/variant/" +props.value.replace("chr","").replace(/_/g,"-")} target="_blank">{props.value.replace("chr","").replace(/_/g,":")}</a>),
minWidth: 60,
}, {
Header: () => (<span title="p-value" style={{textDecoration: 'underline'}}>p-value</span>),
accessor: 'pval',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: props => props.value.toExponential(1),
minWidth: 50,
}, {
Header: () => (<span title="effect size" style={{textDecoration: 'underline'}}>effect size</span>),
accessor: 'beta',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: props => props.value,
minWidth: 50,
}, {
Header: () => (<span title="Gene" style={{textDecoration: 'underline'}}>Gene</span>),
accessor: 'most_severe_gene',
Cell: props => props.value != "NA" ? (<a href={"/gene/" + props.value} target="_blank">{props.value}</a>):"NA",
minWidth: 50,
}, {
Header: () => (<span title="Consequence" style={{textDecoration: 'underline'}}>Consequence</span>),
accessor: 'most_severe_consequence',
Cell: props => props.value ,
minWidth: 50,
}, {
Header: () => (<span title="minimum allele frequency" style={{textDecoration: 'underline'}}>MAF</span>),
accessor: 'maf',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: props => props.value,
minWidth: 40,
}, {
Header: () => (<span title="MAF (cases)" style={{textDecoration: 'underline'}}>MAF (cases)</span>),
accessor: 'maf_cases',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: props => props.value,
minWidth: 40,
}, {
Header: () => (<span title="MAF (controls)" style={{textDecoration: 'underline'}}>MAF (controls)</span>),
accessor: 'maf_controls',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: props => props.value,
minWidth: 40,
}, {
Header: () => (<span title="INFO" style={{textDecoration: 'underline'}}>INFO</span>),
accessor: 'FG_INFO',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: props => props.value,
minWidth: 40,
}, {
Header: () => (<span title="Finnish Enrichment" style={{textDecoration: 'underline'}}>Finnish enrichment</span>),
accessor: 'GENOME_FI_enrichment_nfe_est',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: props => props.value,
minWidth: 50,
}, {
Header: () => (<span title="Credible set PIP" style={{textDecoration: 'underline'}}>CS PIP</span>),
accessor: 'cs_prob',
Cell: props => props.value,
minWidth: 40
}, {
Header: () => (<span title="Functional Category" style={{textDecoration: 'underline'}}>Functional variant</span>),
accessor: 'functional_category',
Cell: props => props.value,
minWidth: 40
}, {
Header: () => (<span title="Matching trait" style={{textDecoration: 'underline'}}>Matching trait</span>),
accessor: 'trait_name',
sortMethod: stringToCountSorter,
Cell: props => <div><span title={props.value}>{truncateString(props.value,2)}</span></div>,
minWidth: 40
}, {
Header: () => (<span title="R^2 to lead variant" style={{textDecoration: 'underline'}}>R^2 to lead variant</span>),
accessor: 'r2_to_lead',
Cell: props => props.value,
minWidth: 40
}]

const regionTableCols = [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>phenotype</span>),
    accessor: 'phenocode',
    Cell: props => (<a href={"/pheno/" + props.value} target="_blank">{props.value}</a>),
    width: Math.min(270, 270/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="region" style={{textDecoration: 'underline'}}>region</span>),
    accessor: 'start',
    Cell: props => (<a href={"/region/" + props.original.phenocode + "/" + props.original.chr + ":" + props.original.start + "-" + props.original.end} target="_blank">{props.original.chr + ':' + props.original.start + '-' + props.original.end}</a>),
    width: Math.min(270, 270/maxTableWidth*window.innerWidth),
    Filter: ({ filter, onChange }) =>
	null,
}, {
    Header: () => (<span title="does the variant belong to a credible set" style={{textDecoration: 'underline'}}>variant in a credible set?</span>),
    accessor: 'credible',
    Cell: props => {props.value},
    width: Math.min(270, 270/maxTableWidth*window.innerWidth)
}]

const lofTableCols = [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>phenotype</span>),
    accessor: 'phenostring',
    Cell: props => (<a href={"/pheno/" + props.original.pheno} target="_blank">{props.value}</a>),
    minWidth: 400,
}, {
    Header: () => (<span title="gene" style={{textDecoration: 'underline'}}>gene</span>),
    accessor: 'gene',
    Cell: props => (<a href={"/gene/" + props.value} target="_blank">{props.value}</a>),
    minWidth: 80
}, {
    Header: () => (<span title="variants" style={{textDecoration: 'underline'}}>variants</span>),
    accessor: 'variants',
    Cell: props => props.value.split(',').map(v => v.trim().replace(/^chr/, '').replace(/_/g, ':')).join(', '),
    minWidth: 200
}, {
    Header: () => (<span title="p-value" style={{textDecoration: 'underline'}}>p-value</span>),
    accessor: 'p_value',
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    minWidth: 70,
    Cell: props => props.value.toExponential(1)
}, {
    Header: () => (<span title="effect size beta" style={{textDecoration: 'underline'}}>beta</span>),
    accessor: 'beta',
    minWidth: 70,
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > filter.value,
    Cell: props => props.value.toPrecision(3)
}, {
    Header: () => (<span title="reference allele count in cases" style={{textDecoration: 'underline'}}>ref cases</span>),
    accessor: 'ref_count_cases',
    minWidth: 90,
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="alternative allele count in cases" style={{textDecoration: 'underline'}}>alt cases</span>),
    accessor: 'alt_count_cases',
    minWidth: 90,
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="reference allele count in controls" style={{textDecoration: 'underline'}}>ref controls</span>),
    accessor: 'ref_count_ctrls',
    minWidth: 90,
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="alternative allele count in controls" style={{textDecoration: 'underline'}}>alt controls</span>),
    accessor: 'alt_count_ctrls',
    minWidth: 90,
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}]

const chipTableCols = [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>pheno</span>),
    accessor: 'LONGNAME',
    filterMethod: (filter, row) => {
	var v = filter.value.split('|')
	return (v[0] == 'top' ? !!row._original.is_top : true) && row[filter.id].toLowerCase().indexOf(v[1]) > -1
    },
    Filter: ({ filter, onChange }) => {
	return (<div>
	<select
	onChange={event => { return onChange(event.target.value + (filter && filter.value.split('|')[1] || ''))}}
	style={{ width: "100%" }}
	value={filter ? filter.value.split('|')[0] + '|' : "all|"}
        >
	<option value="all|">all phenos</option>
	<option value="top|">only top pheno per variant</option>
        </select><br/>
	<input style={{float: 'left'}} type="text" onChange={event => onChange((filter && filter.value.split('|')[0] || 'all')  + '|' + event.target.value)}/>
	 </div>)
    },
    Cell: props => (<a href={"/pheno/" + props.original.pheno} target="_blank">{props.value == 'NA' ? props.original.pheno : props.value}</a>),
    width: Math.min(300, 300/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="chr:pos:ref:alt build 38" style={{textDecoration: 'underline'}}>variant</span>),
    accessor: 'variant',
    sortMethod: variantSorter,
    Cell: props => (
	    <a href={"/variant/" + props.value.replace(/:/g, '-')} target="_blank">{props.value}</a>
    ),
    width: Math.min(150, 150/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="rsid" style={{textDecoration: 'underline'}}>rsid</span>),
    accessor: 'rsid',
    width: Math.min(110, 110/maxTableWidth*window.innerWidth),
    Cell: props => props.value == 'NA' ? props.value : (
	    <a href={"/variant/" + props.original.variant.replace(/:/g, '-')} target="_blank">{props.value}</a>
    )
}, {
    Header: () => (<span title="most severe variant consequence from Variant Effect Predictor" style={{textDecoration: 'underline'}}>consequence</span>),
    accessor: 'most_severe',
    //filterMethod: (filter, rows) => matchSorter(rows, filter.value, { keys: ['most_severe'] }),
    width: Math.min(110, 110/maxTableWidth*window.innerWidth),
    Cell: props => props.value.replace(/_/g, ' ').replace(' variant', '')
}, {
    Header: () => (<span title="variant category from gnomAD annotation" style={{textDecoration: 'underline'}}>category</span>),
    accessor: 'annotation',
    filterMethod: (filter, row) => {
	if (filter.value === "all") {
	    return true
	}
	return row[filter.id] == filter.value
    },
    Filter: ({ filter, onChange }) =>
	<select
    onChange={event => onChange(event.target.value)}
    style={{ width: "100%" }}
    value={filter ? filter.value : "all"}
        >
	<option value="all">all</option>
	<option value="pLoF">pLoF</option>
	<option value="LC">LC</option>
	<option value="missense">missense</option>
	<option value="synonymous">synonymous</option>
        </select>,
    Cell: props => props.value.replace(/_/g, ' ').replace(' variant', ''),
    width: Math.min(120, 120/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="gene symbol" style={{textDecoration: 'underline'}}>gene</span>),
    accessor: 'gene',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase()),
    Cell: props => (
	props.value == 'NA' ? props.value : <a href={"/gene/" + props.value} target="_blank">{props.value}</a>
    )
}, {
    Header: () => (<span title="allele frequency" style={{textDecoration: 'underline'}}>af</span>),
    accessor: 'maf',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => (props.value).toExponential(1)
    }, {
        Header: () => (<span title="af_fin/af_nfsee in gnomAD genomes" style={{textDecoration: 'underline'}}>FIN enr</span>),
        accessor: 'enrichment_nfsee',
        width: Math.min(60, 60/maxTableWidth*window.innerWidth),
        filterMethod: (filter, row) => row[filter.id] >= filter.value,
        Cell: props => {
    	return isNaN(+props.value) ? 'NA' :
    	    <div style={{color: +props.original['enrichment_nfsee'] > 5 ? 'rgb(25,128,5,1)'
     			 : 'inherit'}}>
    	    {props.value == 1e6 ? 'inf' : Number(props.value).toPrecision(3)}
    	</div>
        }
}, {
    Header: () => (<span title="p-value in chip GWAS" style={{textDecoration: 'underline'}}>pval</span>),
    accessor: 'pval',
    width: Math.min(70, 70/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => {
	return isNaN(+props.value) ? '' :
	    <div style={{color: +props.original['pval'] < 5e-8 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    {props.value.toExponential(1)}
	</div>
    }
// }, {
//     Header: () => (<span title="effect size beta in chip GWAS" style={{textDecoration: 'underline'}}>beta</span>),
//     accessor: 'beta',
//     width: Math.min(60, 60/maxTableWidth*window.innerWidth),
//     filterMethod: (filter, row) => Math.abs(row[filter.id]) > filter.value,
//     Cell: props => {
//         return isNaN(+props.value) ? '' :
//         props.value.toPrecision(3)
//     }
}, {
    Header: () => (<span title="recessive p-value in FinnGen" style={{textDecoration: 'underline'}}>rec p</span>),
    accessor: 'pval_recessive',
    width: Math.min(70, 70/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    sortMethod: naSorter,
    Cell: props => {
	return isNaN(+props.value) ? 'NA' :
	    <div style={{color: +props.original['pval_recessive'] < 5e-8 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    {props.value.toExponential(1)}
	</div>
    }
}, {
    Header: () => (<span title="number of alt homozygotes in cases" style={{textDecoration: 'underline'}}>n hom cases</span>),
    accessor: 'n_hom_cases',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="number of heterozygotes in cases" style={{textDecoration: 'underline'}}>n het cases</span>),
    accessor: 'n_het_cases',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="number of alt homozygotes in cases" style={{textDecoration: 'underline'}}>n hom ctrls</span>),
    accessor: 'n_hom_controls',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="number of heterozygotes in controls" style={{textDecoration: 'underline'}}>n het ctrls</span>),
    accessor: 'n_het_controls',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="HWE exact p-value" style={{textDecoration: 'underline'}}>HW pval</span>),
    accessor: 'HW_exact_p_value',
    width: Math.min(70, 70/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] >= filter.value,
    Cell: props => <div style={{color: props.value < 1e-12 ? 'rgb(224,108,117)' : 'inherit'}}>{props.value.toExponential(1)}</div>
}, {
    Header: () => (<span title="missing genotype proportion" style={{textDecoration: 'underline'}}>missing</span>),
    accessor: 'missing_proportion',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => <div style={{color: props.value > 0.2 ? 'rgb(224,108,117)' : 'inherit'}}>{props.value.toPrecision(2)}</div>
}, {
    Header: () => (<span title="is the variant in imputed data" style={{textDecoration: 'underline'}}>in imputed set</span>),
    accessor: 'imputed',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] == filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="links to other sites" style={{textDecoration: 'underline'}}>links</span>),
    accessor: 'grch37_locus',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: null,
    Cell: props => {
	const grch37 = props.value && props.value != 'NA' ? (<a href={"https://gnomad.broadinstitute.org/variant/" + props.value.replace(/:/g, '-') + '-' + props.original.variant.split(':').slice(2).join('-')} target="_blank">gn2</a>) : null
	const grch38 = props.original.gnomad3 == 1 ? (<a style={{float: 'right'}} href={"https://gnomad.broadinstitute.org/variant/" + props.original.variant.split(':').join('-') + '?dataset=gnomad_r3'} target="_blank">gn3</a>) : null
	return <div>
	    {grch37}
	{grch38}
	</div>
    }
}]

const codingTableCols = [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>pheno</span>),
    accessor: 'phenoname',
    filterMethod: (filter, row) => {
	var v = filter.value.split('|')
	return (v[0] == 'top' ? !!row._original.is_top : true) && row[filter.id].toLowerCase().indexOf(v[1]) > -1
    },
    Filter: ({ filter, onChange }) => {
	return (<div>
	<select
	onChange={event => { return onChange(event.target.value + (filter && filter.value.split('|')[1] || ''))}}
	style={{ width: "100%" }}
	value={filter ? filter.value.split('|')[0] + '|' : "all|"}
        >
	<option value="all|">all phenos</option>
	<option value="top|">only top pheno per variant</option>
        </select><br/>
	<input style={{float: 'left'}} type="text" onChange={event => onChange((filter && filter.value.split('|')[0] || 'all')  + '|' + event.target.value)}/>
	 </div>)
    },
    Cell: props => (<a href={"/pheno/" + props.original.pheno} target="_blank">{props.value == 'NA' ? props.original.pheno : props.value}</a>),
    width: Math.min(330, 330/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="chr:pos:ref:alt build 38" style={{textDecoration: 'underline'}}>variant</span>),
    accessor: 'variant',
    filterMethod: (filter, row) => {
	const s = row[filter.id].split(':')
	var v = filter.value.split('|')
	v[1] = v[1].replace('chr', '').replace('X', '23').replace(/_|-/g, ':')
	return (v[0] == 'no HLA/APOE' ? !(+s[0] == 6 && +s[1] > 23000000 && +s[1] < 38000000) && !(+s[0] == 19 && +s[1] > 43000000 && +s[1] < 46000000) : true) && row[filter.id].toLowerCase().indexOf(v[1]) > -1
    },
    Filter: ({ filter, onChange }) => {
	return (<div>
	<select
	onChange={event => { return onChange(event.target.value + (filter && filter.value.split('|')[1] || ''))}}
	style={{ width: "100%" }}
	value={filter ? filter.value.split('|')[0] + '|' : "all variants|"}
        >
	<option value="all variants|">all variants</option>
	<option value="no HLA/APOE|">no HLA/APOE</option>
        </select><br/>
		<input style={{float: 'left', width: '140px'}} type="text" onChange={event => onChange((filter && filter.value.split('|')[0] || 'all')  + '|' + event.target.value)}/>
	 </div>)
    },
    sortMethod: variantSorter,
    Cell: props => (
	    <a href={"/variant/" + props.value.replace(/:/g, '-')} target="_blank">{props.value}</a>
    ),
    width: Math.min(150, 150/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="rsid" style={{textDecoration: 'underline'}}>rsid</span>),
    accessor: 'rsid',
    width: Math.min(110, 110/maxTableWidth*window.innerWidth),
    Cell: props => (
	    <a href={"/variant/" + props.original.variant.replace(/:/g, '-')} target="_blank">{props.value}</a>
    )
}, {
    Header: () => (<span title="most severe variant consequence from Variant Effect Predictor" style={{textDecoration: 'underline'}}>consequence</span>),
    accessor: 'most_severe',
    //filterMethod: (filter, rows) => matchSorter(rows, filter.value, { keys: ['most_severe'] }),
    width: Math.min(120, 120/maxTableWidth*window.innerWidth),
    Cell: props => props.value.replace(/_/g, ' ').replace(' variant', '')
}, {
    Header: () => (<span title="variant category from gnomAD annotation" style={{textDecoration: 'underline'}}>category</span>),
    accessor: 'variant_category',
    filterMethod: (filter, row) => {
	if (filter.value === "all") {
	    return true
	}
	return row[filter.id] == filter.value
    },
    Filter: ({ filter, onChange }) =>
	<select
    onChange={event => onChange(event.target.value)}
    style={{ width: "100%" }}
    value={filter ? filter.value : "all"}
        >
	<option value="all">all</option>
	<option value="pLoF">pLoF</option>
	<option value="LC">LC</option>
	<option value="inframe_indel">inframe indel</option>
	<option value="missense_variant">missense</option>
	<option value="start_lost">start lost</option>
	<option value="stop_lost">stop lost</option>
        </select>,
    Cell: props => props.value.replace(/_/g, ' ').replace(' variant', ''),
    width: Math.min(120, 120/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="gene symbol" style={{textDecoration: 'underline'}}>gene</span>),
    accessor: 'gene_most_severe',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase()),
    Cell: props => (
	    <a href={"/gene/" + props.value} target="_blank">{props.value}</a>
    )
}, {
    Header: () => (<span title="allele frequency in FinnGen" style={{textDecoration: 'underline'}}>af</span>),
    accessor: 'AF',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => isNaN(+props.value) ? 'NA' : props.value.toExponential(1)
}, {
    Header: () => (<span title="af_fin/af_nfsee in gnomAD exomes (-2 when fin.AC == nfsee.AC == 0, -1 when fin.AC == fin.AN == 0)" style={{textDecoration: 'underline'}}>FIN enr</span>),
    accessor: 'enrichment_nfsee',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] >= filter.value,
    Cell: props => {
	return isNaN(+props.value) ? '' :
	    <div style={{color: +props.original['enrichment_nfsee'] > 5 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    {props.value == 1e6 ? 'inf' : Number(props.value).toPrecision(3)}
	</div>
    }
}, {
    Header: () => (<span title="imputation INFO score in FinnGen" style={{textDecoration: 'underline'}}>INFO</span>),
    accessor: 'INFO',
    filterMethod: (filter, row) => row[filter.id] >= filter.value,
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    Cell: props => isNaN(+props.value) ? 'NA' : props.value.toPrecision(3)
}, {
    Header: () => (<span title="p-value in FinnGen" style={{textDecoration: 'underline'}}>pval</span>),
    accessor: 'pval',
    width: Math.min(70, 70/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => {
	return isNaN(+props.value) ? '' :
	    <div style={{color: +props.original['pval'] < 5e-8 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    {props.value.toExponential(1)}
	</div>
    }
}, {
    Header: () => (<span title="effect size beta in FinnGen" style={{textDecoration: 'underline'}}>beta</span>),
    accessor: 'beta',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > filter.value,
    Cell: props => {
        return isNaN(+props.value) ? '' :
        props.value.toPrecision(3)
    }
}, {
    Header: () => (<span title="posterior inclusion probability in FinnGen" style={{textDecoration: 'underline'}}>PIP</span>),
    accessor: 'pip',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > filter.value,
    sortMethod: naSmallSorter,
    Cell: props => {
        return isNaN(+props.value) ? 'NA' :
        props.value.toPrecision(3)
    }
}, {
    Header: () => (<span title="recessive p-value in FinnGen" style={{textDecoration: 'underline'}}>rec p</span>),
    accessor: 'pval_recessive',
    width: Math.min(70, 70/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    sortMethod: naSorter,
    Cell: props => {
	return isNaN(+props.value) ? 'NA' :
	    <div style={{color: +props.original['pval_recessive'] < 5e-8 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    {props.value.toExponential(1)}
	</div>
    }
}, {
    Header: () => (<span title="dominant p-value in FinnGen" style={{textDecoration: 'underline'}}>dom p</span>),
    accessor: 'pval_dominant',
    width: Math.min(70, 70/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    sortMethod: naSorter,
    Cell: props => {
	return isNaN(+props.value) ? 'NA' :
	    <div style={{color: +props.original['pval_dominant'] < 5e-8 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    {props.value.toExponential(1)}
	</div>
    }
}, {
    Header: () => (<span title="log10(p_rec/p_dom) in FinnGen" style={{textDecoration: 'underline'}}>rec/dom</span>),
    accessor: 'rec_dom_log_ratio',
    width: Math.min(70, 70/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    sortMethod: naSorter,
    Cell: props => {
	return isNaN(+props.value) ? 'NA' :
	    props.value.toPrecision(3)
    }
}, window.release == 'R4' ?
			 {
    Header: () => (<span title="number of alt homozygotes in FinnGen" style={{textDecoration: 'underline'}}>n hom</span>),
    accessor: 'AC_Hom',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value/2
			 } :
			 {
    Header: () => (<span title="number of alt homozygotes in cases" style={{textDecoration: 'underline'}}>n hom cases</span>),
    accessor: 'n_hom_cases',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="links to other sites" style={{textDecoration: 'underline'}}>links</span>),
    accessor: 'grch37_locus',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: null,
    Cell: props => {
	const grch37 = props.value.replace(/:/g, '-') + '-' + props.original.variant.split(':').slice(2).join('-')
	return (
	    <div>
	    <span style={{paddingRight: '5px'}}><a href={`http://${window.release_prev.toLowerCase()}.finngen.fi/variant/${props.original.variant.replace(/:/g, '-')}`} target="_blank">{window.release_prev}</a></span>
	    <span><a href={"https://gnomad.broadinstitute.org/variant/" + grch37} target="_blank">gn</a></span>
	    </div>
	)
    }
}]

export { phenolistTableCols, lofTableCols, chipTableCols, codingTableCols, regionTableCols, phenoTableCols, csTableCols, csInsideTableCols }
