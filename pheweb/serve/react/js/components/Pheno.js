import React from 'react'
import { Link } from 'react-router-dom'
import ReactTable from 'react-table'
import { CSVLink } from 'react-csv'
import { phenoTableCols } from '../tables.js'

class Pheno extends React.Component {

    constructor(props) {
	if (!phenoTableCols[window.browser]) {
	    alert('no table columns for ' + window.browser)
	}
        super(props)
        this.state = {
	    columns: phenoTableCols[window.browser]
	}
	this.getPheno = this.getPheno.bind(this)
	this.getPheno(props.match.params.pheno)
	this.getManhattan = this.getManhattan.bind(this)
	this.getManhattan(props.match.params.pheno)
	this.getQQ = this.getQQ.bind(this)
	this.getQQ(props.match.params.pheno)
    }

    //TODO create module
    componentDidMount() {
	const script = document.createElement('script')
	script.src = '/static/pheno.js'
	script.async = false
	document.body.appendChild(script)
    }
    
    componentWillReceiveProps(nextProps) {
	console.log('new props:')
	console.log(nextProps)
    }

    getPheno(phenocode) {
	fetch('/api/pheno/' + phenocode)
	    .then(response => {
		if (!response.ok) throw response
		return response.json()
	    })
	    .then(response => {
		this.setState({
		    pheno: response
		})
	    })
	    .catch(error => {
		alert(`${phenocode}: ${error.statusText || error}`)
	    })
    }

    getManhattan(phenocode) {
	fetch(`/api/manhattan/pheno/${phenocode}`)
            .then(response => {
		if (!response.ok) throw response
		return response.json()
	    }).then(data => {
		console.log(data)
		//TODO all variants must have annotation
		data.unbinned_variants.filter(variant => !!variant.annotation).forEach(variant => {
                    variant.most_severe = variant.annotation.most_severe ? variant.annotation.most_severe.replace(/_/g, ' ').replace(' variant', '') : ''
                    variant.info = variant.annotation.INFO
		})
		//TODO server side
		data.unbinned_variants.forEach(variant => {
		    if (!variant.gnomad) {
			variant.fin_enrichment = -1
		    } else if (variant.gnomad.AF_fin === 0) {
			variant.fin_enrichment = 0
		    } else if (+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu'] == 0) {
			variant.fin_enrichment = 1e6
		    } else {
			variant.fin_enrichment = +variant.gnomad['AC_fin'] / +variant.gnomad['AN_fin'] /
			    ( (+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu']) / (+variant.gnomad['AN_nfe_nwe'] + +variant.gnomad['AN_nfe_onf'] + +variant.gnomad['AN_nfe_seu']) )
		    }
		})
		this.setState({data: data})
		create_gwas_plot(data.variant_bins, data.unbinned_variants);
            })
	    .catch(error => {
		alert(`${phenocode}: ${error.statusText || error}`)
	    })
		}

    getQQ(phenocode) {
	fetch(`/api/qq/pheno/${phenocode}.json`)
            .then(response => {
                if (!response.ok) throw response
		return response.json()
	    }).then(data => {
		this.setState({qq: data})
		if (data.by_maf)
                    create_qq_plot(data.by_maf)
		else
                    create_qq_plot([{maf_range:[0,1],qq:data.overall.qq, count:data.overall.count}])
            })
	    .catch(error => {
		alert(`${phenocode}: ${error.statusText || error}`)
	    })
		}
    
    shouldComponentUpdate(nextProps, nextState) {
	return true
    }
    
    render() {

	if (!this.state.pheno) {
	    return <div>loading</div>
	}

	const pheno = this.state.pheno
	const n_cc = pheno.cohorts ? pheno.cohorts.map(cohort => <tr key={cohort.cohort}><td>{cohort.cohort}</td><td><b>{cohort.num_cases}</b> cases</td><td><b>{cohort.num_controls}</b> controls</td></tr>) : <tr>{pheno.num_cases}</tr>
	const var_table = this.state.data ?
	      <div>
	    <ReactTable
	    ref={(r) => this.reactTable = r}
	data={this.state.data.unbinned_variants}//.filter(v => !!v.peak)}
	filterable
	defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase())}
	columns={this.state.columns}
	defaultSorted={[{
	    id: "pval",
	    desc: false
	}]}
	defaultPageSize={10}
	className="-striped -highlight"
	    />
	    </div> :
	<div>loading</div>
	const qq_table = this.state.qq ?
	      <div>
	      <table className='column_spacing'>
	      <tbody>
	      {Object.keys(this.state.qq.overall.gc_lambda).sort().reverse().map(perc => <tr key={perc}><td>GC lambda {perc}</td><td>{this.state.qq.overall.gc_lambda[perc]}</td></tr>)}
	      </tbody>
	    </table>
	    </div> :
	<div>loading</div>

        return (
		<div style={{width: '100%', padding: '0'}}>
		<h2 style={{marginTop: 0}}>{this.state.pheno.phenostring}</h2>
		<p>{this.state.pheno.category}</p>
		<p style={{marginBottom: '10px'}}><a style={{fontSize:'1.25rem', padding: '.25rem .5rem', backgroundColor: '#2779bd', color: '#fff', borderRadius: '.25rem', fontWeight: 700, boxShadow: '0 0 5px rgba(0,0,0,.5)'}}
	    href="https://risteys.finngen.fi/phenocode/{{ this.state.pheno.phenocode.replace('_EXALLC', '').replace('_EXMORE', '') }}" target="_blank">RISTEYS</a></p>
		<table className='column_spacing'>
		<tbody>
		{n_cc}
	    </tbody>
		</table>
		<div id='manhattan_plot_container' />
		<h3>Lead variants</h3>
		{var_table}
		<h3>QQ plot</h3>
		<div id='qq_plot_container' style={{width:'400px'}} />
		{qq_table}
		</div>
        )
    }
}

export default Pheno
