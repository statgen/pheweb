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
		{label: 'n Affy', key: 'n_chip'},
		{label: 'pval R3', key: 'pval'},
		{label: 'beta R3', key: 'beta'}
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
		This table contains the top association for each coding variant in FinnGen data freeze 3 (1,801 endpoints). The following gnomAD annotation categories are included:
	    predicted loss-of-function (pLoF), low-confidence loss-of-function (LC), inframe indel, missense, start lost, stop lost.
		Variants have been filtered to 0.0005 &lt; FIN AF in gnomAD &lt; 0.1 and imputation INFO score &gt; 0.6. There are 57,100 variants in the table.
		</p>
		<p style={{paddingBottom: '10px'}}>
		Finnish enrichment (FIN enr) is calculated as FIN AF / NFSEE AF in gnomAD, where NFSEE is non-Finnish-non-Swedish-non-Estonian European. The n Affy column indicates in how many FinnGen1 array batches the variant has been called (there are 20 batches in R3). p-values &lt; 5e-8 and Finnish enrichment &gt; 5 are in green. As the consequence and category columns are based on different genome builds (38 and 37 respectively), they differ for some variants. Hover over the column names to see their explanations, click on the column names to sort by them, and type values in the boxes below the column names to filter. Click on a variant, phenotype, or gene to get to its PheWeb page.
		</p>
		{!this.state.data ?
		 <div>.. . loading . ..</div> :
		 <div style={{width: 'fit-content'}}>
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
