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

const mainTableCols = [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>pheno</span>),
    accessor: 'phenoname',
    filterMethod: (filter, row) => {
	if (row._index == 1) {
	    console.log(filter)
	}
	if (!filter.value) return true
	var v = filter.value.split('|')
	if (v[0] == 'top') {
	    return !!row._original.is_top && row[filter.id].toLowerCase().indexOf(v[1]) > -1
	} else {
	    return row[filter.id].toLowerCase().indexOf(v[1]) > -1
	}
	return true
    },
    Filter: ({ filter, onChange }) =>
	<div>
	<select
    onChange={event => { return onChange(event.target.value + filter && filter.value && filter.value.split('|')[1] || '')}}
    style={{ width: "100%" }}
    value={filter ? filter.value : "all|"}
        >
	<option value="all|">all phenos</option>
	<option value="top|">only top pheno per variant</option>
        </select><br/>
	<input style={{float: 'left'}} type="text" onChange={event => onChange(filter && filter.value && (filter.value.split('|')[0] + '|' + event.target.value))}/>
	</div>
    ,
    Cell: props => (<a href={"/pheno/" + props.original.pheno} target="_blank">{props.value == 'NA' ? props.original.pheno : props.value}</a>),
    width: Math.min(330, 330/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="chr:pos:ref:alt build 38" style={{textDecoration: 'underline'}}>variant</span>),
    accessor: 'variant',
    filterMethod: (filter, row) => {
	if (filter.value == "no HLA/APOE") {
	    const s = row[filter.id].split(':')
	    return !(+s[0] == 6 && +s[1] > 23000000 && +s[1] < 38000000) && !(+s[0] == 19 && +s[1] > 43000000 && +s[1] < 46000000)
	}
	return true
    },
    Filter: ({ filter, onChange }) =>
	<select
    onChange={event => onChange(event.target.value)}
    style={{ width: "100%" }}
    value={filter ? filter.value : "all variants"}
        >
	<option value="all variants">all</option>
	<option value="no HLA/APOE">no HLA/APOE</option>
        </select>,
    sortMethod: variantSorter,
    Cell: props => (
	    <a href={"/variant/" + props.value.replace(/:/g, '-')} target="_blank">{props.value}</a>
    ),
    width: Math.min(170, 170/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="rsid" style={{textDecoration: 'underline'}}>rsid</span>),
    accessor: 'rsid',
    width: Math.min(120, 120/maxTableWidth*window.innerWidth),
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
    width: Math.min(170, 170/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="gene symbol" style={{textDecoration: 'underline'}}>gene</span>),
    accessor: 'gene_most_severe',
    width: Math.min(120, 120/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase()),
    Cell: props => (
	    <a href={"/gene/" + props.value} target="_blank">{props.value}</a>
    )
}, {
    Header: () => (<span title="allele frequency in FinnGen R4" style={{textDecoration: 'underline'}}>af</span>),
    accessor: 'AF',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => (props.value).toExponential(1)
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
    Header: () => (<span title="imputation INFO score in FinnGen R4" style={{textDecoration: 'underline'}}>INFO</span>),
    accessor: 'INFO',
    filterMethod: (filter, row) => row[filter.id] >= filter.value,
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    Cell: props => props.value.toPrecision(3)
}, {
    Header: () => (<span title="p-value in FinnGen R4" style={{textDecoration: 'underline'}}>pval R4</span>),
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
    Header: () => (<span title="effect size beta in FinnGen R4" style={{textDecoration: 'underline'}}>beta R4</span>),
    accessor: 'beta',
    width: Math.min(70, 70/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > filter.value,
    Cell: props => {
        return isNaN(+props.value) ? '' :
        props.value.toPrecision(3)
    }
}, {
    Header: () => (<span title="recessive p-value in FinnGen R4" style={{textDecoration: 'underline'}}>rec pval</span>),
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
    Header: () => (<span title="number of alt homozygotes in FinnGen R4" style={{textDecoration: 'underline'}}>ac hom</span>),
    accessor: 'AC_Hom',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="links to other sites" style={{textDecoration: 'underline'}}>links</span>),
    accessor: 'variant',
    width: Math.min(110, 110/maxTableWidth*window.innerWidth),
    filterMethod: null,
    Cell: props => {
	const grch37 = props.original.grch37_locus.replace(/:/g, '-') + '-' + props.value.split(':').slice(2).join('-')
	return (
	    <div>
	    <span style={{paddingRight: '5px'}}><a href={"http://r3.finngen.fi/variant/" + props.value.replace(/:/g, '-')} target="_blank">R3</a></span>
	    <span style={{paddingRight: '5px'}}><a href={"http://r2.finngen.fi/variant/" + props.value.replace(/:/g, '-')} target="_blank">R2</a></span>
	    <span><a href={"https://gnomad.broadinstitute.org/variant/" + grch37} target="_blank">gnomAD</a></span>
	    </div>
	)
    }
    
}]


export { mainTableCols, regionTableCols }
