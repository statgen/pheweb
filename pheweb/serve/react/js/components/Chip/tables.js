import React from 'react'
import ReactDOMServer from 'react-dom/server'

const pval_sentinel = 5e-324

const maxTableWidth = 1600

const variantSorter = (a, b) => {
    const v1 = a.split(':').map(e => +e)
    const v2 = b.split(':').map(e => +e)
    if (v1[0] != v2[0]) return v1[0] > v2[0] ? 1 : -1
    return v1[1] > v2[1] ? 1 : -1
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

const chipTableCols = [{
    Header: () => (<span title="phenotype" style={{textDecoration: 'underline'}}>pheno</span>),
    accessor: 'LONGNAME',
    filterMethod: (filter, row) => {
	var v = filter.value.split('|')
	return (v[0] == 'top' ? !!row._original.is_top : true) && row[filter.id].toLowerCase().indexOf(v[1].toLowerCase()) > -1
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
    Cell: props => (<a href={"https://results.finngen.fi/pheno/" + props.original.pheno} target="_blank">{props.value == 'NA' ? props.original.pheno : props.value}</a>),
    width: Math.min(200, 200/maxTableWidth*window.innerWidth),
}, {
    Header: () => (<span title="chr:pos:ref:alt build 38" style={{textDecoration: 'underline'}}>variant</span>),
    accessor: 'variant',
    sortMethod: variantSorter,
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
    Cell: props => (
	    <a data-html={true} data-tip={ReactDOMServer.renderToString(<img style={{maxWidth: '100%', maxHeight: '100%'}} id='cplot' src={`/api/v1/cluster_plot/${props.value}`} />)} href={"https://gnomad.broadinstitute.org/variant/" + props.value.replace(/:/g, '-') + "?dataset=gnomad_r3"} target="_blank">{props.value}</a>
    ),
    width: Math.min(135, 135/maxTableWidth*window.innerWidth),
	//
}, {
    Header: () => (<span title="rsid" style={{textDecoration: 'underline'}}>rsid</span>),
    accessor: 'rsid',
    width: Math.min(110, 110/maxTableWidth*window.innerWidth),
    Cell: props => props.value == 'NA' ? props.value : (
	    <a href={"https://www.ncbi.nlm.nih.gov/snp/" + props.value} target="_blank">{props.value}</a>
    )
}, {
    Header: () => (<span title="most severe variant consequence from Variant Effect Predictor" style={{textDecoration: 'underline'}}>consequence</span>),
    accessor: 'most_severe',
    width: Math.min(135, 135/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => {
	if (['all variants', 'loss of function', 'missense'].indexOf(filter.value) > -1) {
	    return filter.value == 'all variants' || (filter.value == 'loss of function' && row[filter.id] != 'missense_variant') || (filter.value == 'missense' && row[filter.id] == 'missense_variant')
	} else {
	    return row[filter.id].replace(/_/g, ' ').indexOf(filter.value) > -1
	}
    },
    Filter: ({ filter, onChange }) => {
	return (<div>
		<select
		onChange={event => onChange(event.target.value)}
	style={{ width: "100%" }}
	value={filter ? filter.value : "all variants"}
        >
	<option value="all variants">all variants</option>
	<option value="loss of function">loss of function</option>
	<option value="missense">missense</option>
        </select><br/>
		<input style={{float: 'left', width: '140px'}} type="text" onChange={event => onChange(event.target.value)}/>
		</div>)
    },
    Cell: props => props.value.replace(/_/g, ' ').replace(' variant', '')
}, {
    Header: () => (<span title="gene symbol" style={{textDecoration: 'underline'}}>gene</span>),
    accessor: 'gene_most_severe',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    Cell: props => (
	props.value == 'NA' ? props.value : <a href={"http://www.omim.org/search/?index=entry&sort=score+desc%2C+prefix_sort+desc&start=1&limit=10&search=" + props.value} target="_blank">{props.value}</a>
    )
}, {
    Header: () => (<span title="p-value in chip EWAS" style={{textDecoration: 'underline'}}>pval</span>),
    accessor: 'pval',
    width: Math.min(70, 70/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value.toExponential(1)
}, {
    Header: () => (<span title="p-value in imputed data GWAS" style={{textDecoration: 'underline'}}>pval_imp</span>),
    accessor: 'pval_imp',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value == 'NA' ? props.value : props.value.toExponential(1)
}, {
    Header: () => (<span title="effect size beta in chip EWAS" style={{textDecoration: 'underline'}}>beta</span>),
    accessor: 'beta',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => Math.abs(row[filter.id]) > filter.value,
    Cell: props => {
        return isNaN(+props.value) ? '' :
        props.value.toPrecision(3)
    }
}, {
    Header: () => (<span title="allele frequency (cases+controls)" style={{textDecoration: 'underline'}}>af</span>),
    accessor: 'af_alt',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => (props.value).toExponential(1)
}, {
    Header: () => (<span title="allele frequency (cases)" style={{textDecoration: 'underline'}}>af_case</span>),
    accessor: 'af_alt_cases',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => (props.value).toExponential(1)
}, {
    Header: () => (<span title="allele frequency (controls)" style={{textDecoration: 'underline'}}>af_ctrl</span>),
    accessor: 'af_alt_controls',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => (props.value).toExponential(1)
}, {
    Header: () => (<span title="FIN allele frequency in gnomAD 2.0 exomes" style={{textDecoration: 'underline'}}>af_FIN</span>),
    accessor: 'fin_AF',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    sortMethod: naSmallSorter,
    Cell: props => {
	return props.value == 'NA' ? 'NA' : (+props.value).toExponential(1)
    }
}, {
    Header: () => (<span title="NFSEE (non-Finnish-non-Swedish-non-Estonian European) allele frequency in gnomAD 2.0 exomes" style={{textDecoration: 'underline'}}>af_NFSEE</span>),
    accessor: 'nfsee_AF',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    sortMethod: naSmallSorter,
    Cell: props => isNaN(+props.value) ? 'NA' : (+props.value).toExponential(1)
}, {
    Header: () => (<span title="af_fin/af_nfsee in gnomAD 2 exomes" style={{textDecoration: 'underline'}}>FIN enr</span>),
    accessor: 'enrichment_nfsee',
    width: Math.min(60, 60/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] >= filter.value,
    sortMethod: naSmallSorter,
    Cell: props => {
    	return isNaN(+props.value) ? 'NA' : props.value == 1e6 ? 'inf' : Number(props.value).toPrecision(3)
    }
}, {
    Header: () => (<span title="number of heterozygotes in the 1,069 samples shared between chip and exomes: n_het_exome/n_het_chip/n_het_both_exome_and_chip" style={{textDecoration: 'underline'}}>het_ex_chip</span>),
    accessor: 'het_ex_ch',
    width: Math.min(100, 100/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => props.value
}, {
    Header: () => (<span title="Fisher's exact p-value between allele counts on chip and all Finnish exomes" style={{textDecoration: 'underline'}}>FET_p_ex</span>),
    accessor: 'FET_p',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] >= filter.value,
    sortMethod: naSmallSorter,
    Cell: props => <div style={{color: props.value < 1e-10 ? 'rgb(224,108,117)' : props.value < 1e-5 ? 'rgb(244,188,11)' : 'inherit'}}>{isNaN(props.value) ? 'NA' : Number(props.value).toExponential(1)}</div>
// }, {
//     Header: () => (<span title="HWE exact p-value" style={{textDecoration: 'underline'}}>HW pval</span>),
//     accessor: 'HW_exact_p_value',
//     width: Math.min(70, 70/maxTableWidth*window.innerWidth),
//     filterMethod: (filter, row) => row[filter.id] >= filter.value,
//     Cell: props => <div style={{color: props.value < 1e-12 ? 'rgb(224,108,117)' : 'inherit'}}>{props.value.toExponential(1)}</div>
}, {
    Header: () => (<span title="missing genotype proportion" style={{textDecoration: 'underline'}}>missing</span>),
    accessor: 'missing_proportion',
    width: Math.min(80, 80/maxTableWidth*window.innerWidth),
    filterMethod: (filter, row) => row[filter.id] <= filter.value,
    Cell: props => <div style={{color: props.value > 0.2 ? 'rgb(244,188,11)' : 'inherit'}}>{props.value.toPrecision(2)}</div>
}, {
    Header: () => (<span title="INFO score based on SiSu4 imputation panel (NA if the variant is not in the panel)" style={{textDecoration: 'underline'}}>INFO_imp</span>),
    accessor: 'INFO_sisu4',
    filterMethod: (filter, row) => {
	if (['all variants', 'in panel', 'not in panel'].indexOf(filter.value) > -1) {
	    return filter.value == 'all variants' || (filter.value == 'not in panel' && row[filter.id] == 'NA') || (filter.value == 'in panel' && row[filter.id] != 'NA')
	} else {
	    return +row[filter.id] < +filter.value
	}
    },
    Filter: ({ filter, onChange }) => {
	return (<div>
		<select
		onChange={event => onChange(event.target.value)}
	style={{ width: "100%" }}
	value={filter ? filter.value : "all variants"}
        >
	<option value="all variants">all variants</option>
	<option value="in panel">in panel</option>
	<option value="not in panel">not in panel</option>
        </select><br/>
		<input style={{float: 'left', width: '140px'}} type="text" onChange={event => onChange(event.target.value)}/>
	 </div>)
    },
    sortMethod: naSmallSorter,
    width: Math.min(120, 120/maxTableWidth*window.innerWidth),
    Cell: props => props.value
}]

export { chipTableCols }
