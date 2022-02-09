import React from 'react'
import ReactTable from 'react-table'
import { CSVLink } from 'react-csv'
import { lofTableCols } from '../tables.js'

class LoF extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
	    data: null,
	    columns: lofTableCols,
	    dataToDownload: [],
	    filtered: [],
	    headers: [
		{label: 'pheno', key: 'phenostring'},
		{label: 'gene', key: 'gene'},
		{label: 'variants', key: 'variants'},
		{label: 'p-value', key: 'p_value'},
		{label: 'beta', key: 'beta'},
		{label: 'ref_cases', key: 'ref_count_cases'},
		{label: 'alt_cases', key: 'alt_count_cases'},
		{label: 'ref_controls', key: 'ref_count_ctrls'},
		{label: 'alt_controls', key: 'alt_count_ctrls'}
	    ]
        }
        this.loadData = this.loadData.bind(this)
        this.download = this.download.bind(this)
        this.loadData()
    }

    loadData() {
        fetch('/api/lof')
        .then(response => {
            if (!response.ok) throw response
            return response.json()
        })
            .then(result => {
		console.log(result)
            this.setState({
                data: result.map(r => r.gene_data)
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
		<h2>LoF burden results</h2>
		<div dangerouslySetInnerHTML={{__html: window.lof_content}}>
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
		     id: "p_value",
		     desc: false
		 }]}
		 defaultPageSize={10}
		 className="-striped -highlight"
		 />
		 <p></p>
		 <div className="row">
		 <div className="col-xs-12">
		 <div className="btn btn-primary" onClick={this.download}>Download {this.state.filtered.filter(f => !(f.id === 'variant_category' && f.value === 'all') && !(f.id === 'variant' && f.value === 'all')).length > 0 ? 'filtered' : ''} table</div>
		 </div>
		 </div>
                 <CSVLink
		 headers={this.state.headers}
		 data={this.state.dataToDownload}
		 separator={'\t'}
		 enclosingCharacter={''}
		 filename={`finngen_lof_burden_${window.release}.tsv`}
		 className="hidden"
		 ref={(r) => this.csvLink = r}
		 target="_blank" />
		 </div>}
            </div>
        )
    }
}

export default LoF
