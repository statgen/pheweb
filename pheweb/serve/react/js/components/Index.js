import React from 'react'
import { Link } from 'react-router-dom'
import ReactTable from 'react-table'
import { CSVLink } from 'react-csv'
import { phenolistTableCols } from '../tables.js'

class Index extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
	    phenolistColumns: phenolistTableCols[window.browser]
	}
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

    render() {

	if (!this.state.phenos) {
	    return <div>loading</div>
	}

	console.log(this.state)
	
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
	defaultPageSize={10}
	className="-striped -highlight"
	    />
	    </div>
	
        return (
		<div style={{width: '100%', padding: '0'}}>
		{phenoTable}
		</div>
        )
    }
}

export default Index
