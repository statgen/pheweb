import React from 'react'
import { Link } from 'react-router-dom'
import ReactTable from 'react-table'
import { CSVLink } from 'react-csv'
import { phenolistTableCols } from '../tables.js'

class Index extends React.Component {

    constructor(props) {
	if (!phenolistTableCols[window.browser]) {
	    alert('no table columns for ' + window.browser)
	}
        super(props)
        this.state = {
	    phenolistColumns: phenolistTableCols[window.browser],
	    filtered: [],
	    dataToDownload: [],
	    headers: [
		{label: 'phenotype', key: 'phenostring'},
		{label: 'phenocode', key: 'phenocode'},
		{label: 'category', key: 'category'},
		{label: 'number of cases', key: 'num_cases'},
		{label: 'number of cases R3', key: 'num_cases_prev'},
		{label: 'number of controls', key: 'num_controls'},
		{label: 'genome-wide sig loci', key: 'num_gw_significant'},
		{label: 'genome-wide sig loci R3', key: 'num_gw_significant_prev'},
		{label: 'genomic control lambda', key: 'lambda'}
	    ]
	}
	this.download = this.download.bind(this)
	this.getPhenos = this.getPhenos.bind(this)
	this.getPhenos()
    }

    getPhenos() {
	fetch('/api/phenos')
	    .then(response => {
		if (!response.ok) throw response
		return response.json()
	    })
	    .then(response => {
		response.forEach(pheno => {
		    pheno.lambda = pheno.gc_lambda['0.5']
		})
		this.setState({
		    phenos: response
		})
	    })
	    .catch(error => {
		alert(`${error.statusText || error}`)
	    })
		}

    download() {
	this.setState({
	    dataToDownload: this.reactTable.getResolvedState().sortedData
	}, () => {
	    this.csvLink.link.click()
	})
    }

    render() {

	if (!this.state.phenos) {
	    return <div>loading</div>
	}

	const phenoTable =
	      <div>
	      <h3>Phenotype list</h3>
	    <ReactTable
	    ref={(r) => this.reactTable = r}
	data={this.state.phenos}
	filterable
	defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().includes(filter.value.toLowerCase())}
	columns={this.state.phenolistColumns}
	defaultSorted={[{
	    id: "num_gw_significant",
	    desc: true
	}]}
	defaultPageSize={20}
	className="-striped -highlight"
	    />
	    <div className="row">
	    <div className="col-xs-12">
	    <div className="btn btn-primary" onClick={this.download}>Download {this.state.filtered.filter(f => !(f.id == 'variant_category' && f.value == 'all') && !(f.id == 'variant' && f.value == 'all')).length > 0 ? 'filtered' : ''} table</div>
	    </div>
	    </div>
            <CSVLink
	headers={this.state.headers}
	data={this.state.dataToDownload}
	separator={'\t'}
	enclosingCharacter={''}
	filename="finngen_endpoints.tsv"
	className="hidden"
	ref={(r) => this.csvLink = r}
	target="_blank" />
	    </div>
	
        return (
		<div style={{width: '100%', padding: '0'}}>
		{phenoTable}
		</div>
        )
    }
}

export default Index
