import React from 'react'
import { Link } from 'react-router-dom'
import ReactTable from 'react-table'
import { CSVLink } from 'react-csv'
import { codingTableCols } from '../tables.js'

class Coding extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
	    data: null,
	    columns: codingTableCols,
	    dataToDownload: [],
	    filtered: [],
	    headers: [
		{label: 'pheno', key: 'phenoname'},
		{label: 'variant', key: 'variant'},
		{label: 'rsid', key: 'rsid'},
		{label: 'consequence', key: 'most_severe'},
		{label: 'category', key: 'variant_category'},
		{label: 'gene', key: 'gene_most_severe'},
		{label: 'af', key: 'AF'},
		{label: 'FIN enr', key: 'enrichment_nfsee'},
		{label: 'INFO', key: 'INFO'},
		{label: 'pval', key: 'pval'},
		{label: 'beta', key: 'beta'},
		{label: 'PIP', key: 'pip'},
		{label: 'recessive pval', key: 'pval_recessive'},
		{label: 'dominant pval', key: 'pval_dominant'},
		{label: 'rec/dom log ratio', key: 'rec_dom_log_ratio'},
		{label: 'n alt hom cases', key: 'n_hom_cases'}
	    ]
        }
        this.loadData = this.loadData.bind(this)
        this.download = this.download.bind(this)
        this.loadData()
    }

    loadData() {
        fetch('/api/coding_data')
        .then(response => {
            if (!response.ok) throw response
            return response.json()
        })
            .then(result => {
            this.setState({
                data: result
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

    componentWillReceiveProps(nextProps) {
	console.log(nextProps)
    }

    render() {

        return (
		<div style={{padding: '0'}}>
		<h2>Coding variants</h2>
		<div dangerouslySetInnerHTML={{__html: window.coding_content}}>
		</div>
		{!this.state.data ?
		 <div>.. . loading . ..</div> :
		 <div style={{width: '100%'}}>
		 <ReactTable
		 ref={(r) => this.reactTable = r}
		 data={this.state.data}
		 filterable 
		 defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value)}
		 onFilteredChange={filtered => { this.setState({filtered: filtered})}}
		 columns={this.state.columns}
		 defaultSorted={[{
		     id: "pval",
		     desc: false
		 }]}
		 defaultPageSize={10}
		 className="-striped -highlight"
		 />
		 <p></p>
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
		 filename="finngen_coding_variants.tsv"
		 className="hidden"
		 ref={(r) => this.csvLink = r}
		 target="_blank" />
		 </div>}
            </div>
        )
    }
}

export default Coding
