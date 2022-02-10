import React from 'react'

const pval_sentinel = 5e-324

const maxTableWidth = 1600

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

const stringToCountSorter = (a,b) => {
    const c  =a.split(";").filter(x=> x !== 'NA').length
    const d = b.split(";").filter(x=> x !== 'NA').length
    return d - c
}

const tofixed = (v,n) => {
    return typeof(v) == typeof(0) ? v.toFixed(n) : v
}

const truncateString = (s,l) => {
    return s.split(";").length > l ? s.split(";").slice(0,l).join(";")+"...": s
}

const optionalFloat = (props, nan = 'NA') =>  isNaN(+props.value) ? nan : (+props.value).toPrecision(3)

const regionBuilder = (s,r) => {
    const tmp = s.replace("chr23","chrX").replace("chr","").split("_")
    const chr=tmp[0]
    const pos_min=Math.max( parseInt( tmp[1] ) - r,1 ) //pos starts from 1
    const pos_max=parseInt( tmp[1] ) + r
    return `${chr}:${pos_min}-${pos_max}`
}

const pval_column = {
    Header: () => (<span title="p-value" style={{textDecoration: 'underline'}}>p-value</span>),
    accessor: 'pval',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => (props.value === pval_sentinel)?` << ${pval_sentinel}`:props.value.toExponential(1),
    minWidth: 80,
    id: 'pval'
};

const mlogp_column = {
    Header: () => (<span title="mlog" style={{textDecoration: 'underline'}}>-log10(p)</span>),
    accessor: 'mlogp',
    filterMethod: (filter, row) => row[filter.id] >= +filter.value,
    Cell: optionalFloat ,
    minWidth: 80,
    id: 'mlogp'
};


const phenolistTableCols = {'FINNGEN': [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>phenotype</span>),
    accessor: 'phenostring',
    Cell: props => (<a href={"/pheno/" + props.original.phenocode}
                       rel="noopener noreferrer"
                       target="_blank">{props.value}</a>),
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
    Cell: props => (<a href={"/pheno/" + props.original.phenocode}
                       rel="noopener noreferrer"
                       target="_blank">{props.value}</a>),
    minWidth: 200
}, {
    Header: () => (<span title="ATC code" style={{textDecoration: 'underline'}}>ATC code</span>),
    accessor: 'atc',
    Cell: props => (<a href={"https://www.whocc.no/atc_ddd_index/?code=" + props.value}
                       rel="noopener noreferrer"
                       target="_blank">{props.value}</a>),
    minWidth: 200
},{
    Header: () => (<span title="number of samples" style={{textDecoration: 'underline'}}>number of individuals with &gt; 0 purchases</span>),
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
    Cell: props => (<a href={"/pheno/" + props.original.phenocode}
                       rel="noopener noreferrer"
                       target="_blank">{props.value}</a>),
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
    filterMethod: (filter, row) => row[filter.id] === filter.value,
    minWidth: 40
}, {
    Header: () => (<span title="position in build 38" style={{textDecoration: 'underline'}}>pos</span>),
    accessor: 'pos',
    Cell: props => (<a href={`/variant/${props.original.chrom}-${props.original.pos}-${props.original.ref}-${props.original.alt}`}>{props.value}</a>),
    filterMethod: (filter, row) => {
	const s = filter.value.split('-').map(val => +val)
	if (s.length === 1) return row[filter.id] === filter.value
	else if (s.length === 2) return row[filter.id] > s[0] && row[filter.id] < s[1]
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
}, pval_column ]]


const phenoTableCols = {'GBMA': [...phenoTableCommonCols[0], ...phenoTableCommonCols[1], {
    Header: () => (<span title="allele frequency in UKBB" style={{textDecoration: 'underline'}}>af ukbb</span>),
    accessor: 'maf',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(3),
    minWidth: 110
}, {
    Header: () => (<span title="number of cohorts" style={{textDecoration: 'underline'}}>n cohorts</span>),
    accessor: 'n_cohorts',
    filterMethod: (filter, row) => row[filter.id] >= +filter.value,
    Cell: props => +props.value,
    minWidth: 80
}],
			'FINNGEN': [...phenoTableCommonCols[0],

				    {
    Header: () => (<span title="INFO score" style={{textDecoration: 'underline'}}>INFO</span>),
    accessor: 'info',
    filterMethod: (filter, row) => row[filter.id] >= +filter.value,
    Cell: props => optionalFloat ,
    minWidth: 80
}, {
    Header: () => (<span title="AF enrichment FIN / Non-Finnish-non-Estonian European" style={{textDecoration: 'underline'}}>FIN enrichment</span>),
    accessor: 'fin_enrichment',
    filterMethod: (filter, row) => row[filter.id] > +filter.value,
    Cell: props => {
	const value = +props.value;
	return isNaN(value) ? '' :
	    <div style={{color: value > 5 ? 'rgb(25,128,5,1)' : 'inherit'}}>
	    { value === 1e6 ? 'inf' : value === -1 ? 'NA' : value.toPrecision(3) }
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
    Header: () => (<span title="mlog" style={{textDecoration: 'underline'}}>-log10(p)</span>),
    accessor: 'mlogp',
    filterMethod: (filter, row) => row[filter.id] >= +filter.value,
    Cell: optionalFloat ,
    minWidth: 80
},
   ...(window.show_ukbb === 'True' ?[
{
    Header: () => (<span title="UKBB Neale lab result" style={{textDecoration: 'underline'}}>UKBB</span>),
    accessor: 'UKBB',
    filterMethod: (filter, row) => row[filter.id] < +filter.value,
    Cell: props => props.original.ukbb ? <div>{(Number(props.original.ukbb.beta) >= 0) ? <span style={{color: 'green', float: 'left', paddingRight: '5px'}} className="glyphicon glyphicon-triangle-top" aria-hidden="true"></span> :
					       (Number(props.original.ukbb.beta) < 0) ? <span style={{color: 'red', float: 'left', paddingRight: '5px'}} className="glyphicon glyphicon-triangle-bottom" aria-hidden="true"></span> :
					       <span></span>} {Number(props.original.ukbb.pval).toExponential(1)}</div> : 'NA',
    minWidth: 110
}					
       ]:[])				    
],
'FINNGEN_QUANT': [...phenoTableCommonCols[0],{
    Header: () => (<span title="INFO score in FinnGen" style={{textDecoration: 'underline'}}>INFO FG</span>),
    accessor: 'info',
    filterMethod: (filter, row) => row[filter.id] >= +filter.value,
    Cell: optionalFloat ,
    minWidth: 80
}, {
    Header: () => (<span title="AF enrichment FIN / Non-Finnish-non-Estonian European" style={{textDecoration: 'underline'}}>FIN enrichment</span>),
    accessor: 'fin_enrichment',
    filterMethod: (filter, row) => row[filter.id] > +filter.value,
    Cell: props => {
	const value = +props.value;
	return isNaN(value) ? '' :
	    <div style={{color: value > 5 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    { value === 1e6 ? 'inf' : value === -1 ? 'NA' : value.toPrecision(3) }
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
    Cell: optionalFloat ,
    minWidth: 80
}, {
    Header: () => (<span title="AF enrichment FIN / Non-Finnish-non-Estonian European" style={{textDecoration: 'underline'}}>FIN enrichment</span>),
    accessor: 'fin_enrichment',
    filterMethod: (filter, row) => row[filter.id] > +filter.value,
    Cell: props => {
	const value = +props.value;
	return isNaN(value) ? '' :
	    <div style={{color: value > 5 ? 'rgb(25,128,5,1)'
 			 : 'inherit'}}>
	    { value === 1e6 ? 'inf' : value === -1 ? 'NA' : value.toPrecision(3) }
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
    Cell: props => (<a href={"/region/" + props.original.phenocode+"/"+regionBuilder(props.value,250000)}
                       rel="noopener noreferrer"
                       target="_blank">{props.value.replace("chr","").replace(/_/g,":")}</a>),
    //width: Math.min(270, 270/maxTableWidth*window.innerWidth),
    minWidth: 60,
},{
    Header: () => (<span title="CS quality" style={{textDecoration: 'underline'}}>CS quality</span>),
    accessor: 'good_cs',
    filterMethod: (filter,row) => filter.value === row[filter.id],
    Cell: props => String(props.value),
    minWidth: 60,
}, {
    Header: () => (<span title="chromosome" style={{textDecoration: 'underline'}}>chromosome</span>),
    accessor: 'chrom',
    Cell: props => props.value,
    minWidth: 50,
}, { ...pval_column , minWidth: 50,
}, { ...mlogp_column, accessor: 'lead_mlogp',  minWidth: 50,
}, {
    Header: () => (<span title="effect size (beta)" style={{textDecoration: 'underline'}}>effect size (beta)</span>),
    accessor: 'lead_beta',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => tofixed(props.value,3),
    minWidth: 50,
}, {
    Header: () => (<span title="Finnish Enrichment" style={{textDecoration: 'underline'}}>Finnish Enrichment</span>),
    accessor: 'lead_enrichment',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => tofixed(props.value,3),
    minWidth: 50,
},{
    Header: () => (<span title="Lead variant alternate allele frequency" style={{textDecoration: 'underline'}}>Alternate allele frequency</span>),
    accessor: 'lead_af_alt',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => props.value.toPrecision(3),
    minWidth: 50,
},{
    Header: () => (<span title="Lead Variant Gene" style={{textDecoration: 'underline'}}>Lead Variant Gene</span>),
    accessor: 'lead_most_severe_gene',
    Cell: props => props.value !== "NA" ? (<a href={"/gene/" + props.value}
                                             rel="noopener noreferrer"
                                             target="_blank">{props.value}</a>):"NA",
    minWidth: 50,
}, {
    Header: () => (<span title="number of coding variants in the credible set. Tooltip shows variant name, most severe consequence, R² to lead variant" style={{textDecoration: 'underline'}}># coding in cs</span>),
    accessor: 'functional_variants_strict',
    sortMethod: stringToCountSorter,
    Cell: props => <div><span title={truncateString(props.value,4)}>{props.value.split(";").filter(x=>x!=="NA").length}</span></div>,
    minWidth: 40
}, {
    Header: () => (<span title="# Credible set variants" style={{textDecoration: 'underline'}}># credible variants</span>),
    accessor: 'credible_set_variants',
    sortMethod: stringToCountSorter,
    Cell: props => <div><span title={truncateString(props.value,4)}>{props.original.cs_size}</span></div>,
    minWidth: 50,
},{
    Header: () => (<span title="Credible set Log10 bayes factor" style={{textDecoration: 'underline'}}>Credible set bayes factor (log10)</span>),
    accessor: 'cs_log_bayes_factor',
    filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: props => tofixed(props.value,3),
    minWidth: 50,
}, {
    Header: () => (<span title="CS matching Traits" style={{textDecoration: 'underline'}}>CS matching Traits</span>),
    accessor: 'all_traits_strict',
    sortMethod: stringToCountSorter,
    Cell: props => <div><span title={props.value}>{props.value.split(";").filter(x=>x!=="NA").length}</span></div>,
    minWidth: 60,
}, {
    Header: () => (<span title="LD Partner matching Traits" style={{textDecoration: 'underline'}}>LD Partner Traits</span>),
    accessor: 'all_traits_relaxed',
    sortMethod: stringToCountSorter,
    Cell: props => <div><span title={props.value}>{props.value.split(";").filter(x=>x!=="NA").length}</span></div>,
    minWidth: 60,
},
    ...(window.show_ukbb === 'True' ?[
    { Header: () => (<span title="UKBB Neale lab result" style={{textDecoration: 'underline'}}>UKBB</span>),
      accessor: 'ukbb_pval',
      sortMethod: naSorter,
      Cell: props => props.value !== "NA" ? <div>{(Number(props.original.ukbb_beta) >= 0) ? <span style={{color: 'green', float: 'left', paddingRight: '5px'}} className="glyphicon glyphicon-triangle-top" aria-hidden="true"></span> :
	 				         (Number(props.original.ukbb_beta) < 0) ? <span style={{color: 'red', float: 'left', paddingRight: '5px'}} className="glyphicon glyphicon-triangle-bottom" aria-hidden="true"></span> :
					       <span></span>} {Number(props.value).toExponential(1)}</div> : props.value,
      minWidth: 60 }
    ]:[])
		     

]

const csInsideTableCols = [
//{Header: () => (<span title="Group ID" style={{textDecoration: 'underline'}}>Group ID</span>),
//accessor: 'locus_id',
//Cell: props => props.value,
//minWidth: 60,
//},
{Header: () => (<span title="Variant ID" style={{textDecoration: 'underline'}}>Variant ID</span>),
accessor: 'variant',
Cell: props => (<a href={"/variant/" +props.value.replace("chr","").replace(/_/g,"-")}
                   rel="noopener noreferrer"
                   target="_blank">{props.value.replace("chr","").replace(/_/g,":")}</a>),
minWidth: 60,
}, { ...pval_column , minWidth: 50,
}, { ...mlogp_column, minWidth: 50,
}, {
Header: () => (<span title="effect size" style={{textDecoration: 'underline'}}>effect size</span>),
accessor: 'beta',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: props => props.value,
minWidth: 50,
}, {
Header: () => (<span title="Gene" style={{textDecoration: 'underline'}}>Gene</span>),
accessor: 'most_severe_gene',
Cell: props => props.value !== "NA" ? (<a href={"/gene/" + props.value}
                                          rel="noopener noreferrer"
                                          target="_blank">{props.value}</a>):"NA",
minWidth: 50,
}, {
Header: () => (<span title="Consequence" style={{textDecoration: 'underline'}}>Consequence</span>),
accessor: 'most_severe_consequence',
Cell: props => props.value ,
minWidth: 50,
}, {
Header: () => (<span title="alternate allele frequency (alt. af)" style={{textDecoration: 'underline'}}>alt af</span>),
accessor: 'af_alt',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
    Cell: optionalFloat ,
minWidth: 40,
}, {
Header: () => (<span title="alt. af (cases)" style={{textDecoration: 'underline'}}>alt af (cases)</span>),
accessor: 'af_alt_cases',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: optionalFloat ,
minWidth: 40,
}, {
Header: () => (<span title="alt. af (controls)" style={{textDecoration: 'underline'}}>alt af (controls)</span>),
accessor: 'af_alt_controls',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: optionalFloat,
minWidth: 40,
}, {
Header: () => (<span title="INFO" style={{textDecoration: 'underline'}}>INFO</span>),
accessor: 'INFO',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: optionalFloat,
minWidth: 40,
}, {
Header: () => (<span title="Finnish Enrichment" style={{textDecoration: 'underline'}}>Finnish enrichment</span>),
accessor: 'enrichment_nfsee',
filterMethod: (filter, row) => Math.abs(row[filter.id]) < +filter.value,
Cell: optionalFloat ,
minWidth: 50,
}, {
Header: () => (<span title="Credible set PIP" style={{textDecoration: 'underline'}}>CS PIP</span>),
accessor: 'cs_prob',
Cell: optionalFloat ,
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
    Cell: props => (<a href={"/pheno/" + props.value}
                       rel="noopener noreferrer"
                       target="_blank">{props.value}</a>),
    width: Math.min(270, 270/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="region" style={{textDecoration: 'underline'}}>region</span>),
    accessor: 'start',
    Cell: props => (<a href={"/region/" + props.original.phenocode + "/" + props.original.chr + ":" + props.original.start + "-" + props.original.end}
                       rel="noopener noreferrer"
                       target="_blank">{props.original.chr + ':' + props.original.start + '-' + props.original.end}</a>),
    width: Math.min(270, 270/maxTableWidth*window.innerWidth),
    Filter: ({ filter, onChange }) =>
	null,
}, {
    Header: () => (<span title="does the variant belong to a credible set" style={{textDecoration: 'underline'}}>variant in a credible set?</span>),
    accessor: 'credible',
    Cell: props => props.value,
    width: Math.min(270, 270/maxTableWidth*window.innerWidth)
}]


export { phenolistTableCols, regionTableCols, phenoTableCols, csTableCols, csInsideTableCols, pval_sentinel }
