import React from 'react'
import { Link } from 'react-router-dom'
import ReactTable from 'react-table'
import { CSVLink } from 'react-csv'
import { mainTableCols } from '../tables.js'

class Home extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
	    data: null,
	    columns: mainTableCols,
	    dataToDownload: [],
	    filtered: [],
	    headers: [
		{label: 'top pheno', key: 'phenoname'},
		{label: 'variant', key: 'variant'},
		{label: 'rsid', key: 'rsid'},
		{label: 'consequence', key: 'most_severe'},
		{label: 'category', key: 'variant_category'},
		{label: 'gene', key: 'gene_most_severe'},
		{label: 'af', key: 'AF'},
		{label: 'FIN enr', key: 'enrichment_nfsee'},
		{label: 'INFO', key: 'INFO'},
		{label: 'pval', key: 'pval'},
		{label: 'beta', key: 'beta'}
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
		<p>
		This table contains p &lt; 1e-4 associations for each coding variant in FinnGen data freeze 4 (2,264 endpoints). The following gnomAD annotation categories are included:
	    predicted loss-of-function (pLoF), low-confidence loss-of-function (LC), inframe indel, missense, start lost, stop lost.
		Variants have been filtered to imputation INFO score &gt; 0.6.
		</p>
		<p style={{paddingBottom: '10px'}}>
		Finnish enrichment (FIN enr) is calculated as FIN AF / NFSEE AF in gnomAD, where NFSEE is non-Finnish-non-Swedish-non-Estonian European. p-values &lt; 5e-8 and Finnish enrichment &gt; 5 are in green. As the consequence and category columns are based on different genome builds (38 and 37 respectively), they differ for some variants. Hover over the column names to see their explanations, click on the column names to sort by them, and type values in the boxes below the column names to filter. Click on a variant, phenotype, or gene to get to its page.
		</p>
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

export default Home
