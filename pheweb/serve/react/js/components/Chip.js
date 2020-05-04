import React from 'react'
import { Link } from 'react-router-dom'
import ReactTable from 'react-table'
import { CSVLink } from 'react-csv'
import { chipTableCols } from '../tables.js'

class Chip extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
	    data: null,
	    columns: chipTableCols,
	    dataToDownload: [],
	    filtered: [],
	    headers: [
		{label: 'pheno', key: 'LONGNAME'},
		{label: 'variant', key: 'variant'},
		{label: 'rsid', key: 'rsid'},
		{label: 'consequence', key: 'most_severe'},
		{label: 'category', key: 'annotation'},
		{label: 'gene', key: 'gene'},
		{label: 'af', key: 'maf'},
		{label: 'FIN enr', key: 'enrichment_nfsee'},
		{label: 'pval', key: 'pval'},
		{label: 'recessive pval', key: 'pval_recessive'},
		{label: 'n hom alt cases', key: 'n_hom_cases'},
		{label: 'n het cases', key: 'n_het_cases'},
		{label: 'n hom alt controls', key: 'n_hom_controls'},
		{label: 'n het controls', key: 'n_het_controls'},
		{label: 'HW pval', key: 'HW_exact_p_value'},
		{label: 'missing', key: 'missing_proportion'},
		{label: 'in imputed set', key: 'imputed'},
	    ]
        }
        this.loadData = this.loadData.bind(this)
        this.download = this.download.bind(this)
        this.loadData()
    }

    loadData() {
        fetch('/api/chip_data')
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

	//You can also type e.g. "&lt; 5e-8" in the pval box to see genome-wide significant variants and "&gt; 5e-8" to see the opposite.
            return (
		<div style={{padding: '0'}}>
		<h2>FinnGen1 chip GWAS results</h2>
		    <div dangerouslySetInnerHTML={{__html: window.chip_content}}>
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
		 filename={`finngen_chip_gwas_${window.release}.tsv`}
		 className="hidden"
		 ref={(r) => this.csvLink = r}
		 target="_blank" />
		 </div>}
            </div>
        )
    }
}

export default Chip
