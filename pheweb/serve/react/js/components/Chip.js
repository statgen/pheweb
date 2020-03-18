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
		    <p>This table contains p &lt; 1e-4 associations (additive or recessive) from FinnGen1 chip data GWAS at freeze 5 (150,831 samples on the chip, 2,925 endpoints). GWAS was run similarly as in the core GWAS for the same endpoints. Dosage in recessive analysis is alternative homozygote genotype probability. Variants with MAF &lt; 0.1 are included in the analysis. Variants with missingness &gt; 0.5 have been filtered out. HLA and APOE regions have also been filtered out for usability.
		</p>
		<p style={{paddingBottom: '10px'}}>Consequence annotations are most severe consequences from VEP and annotation categories come from the gnomAD annotation pipeline. Finnish enrichment (FIN enr) is calculated as FIN AF / NFSEE AF in gnomAD 2.1, where NFSEE is non-Finnish-non-Swedish-non-Estonian European. The enrichment is calculated from gnomAD exomes if the variant is in that data, otherwise it is calculated from gnomAD genomes when available. p-values &lt; 5e-8 and Finnish enrichment &gt; 5 are in green. HW p-values &lt; 1e-12 are in red as well as missingness &gt; 0.2.
		</p>
		<p>Hover over the column names to see their explanations, click on the column names to sort by them, and type values in the boxes below the column names to filter. Click on a variant, phenotype, or gene to get to its page.
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
		 filename={`finngen_lof_burden_${window.release}.tsv`}
		 className="hidden"
		 ref={(r) => this.csvLink = r}
		 target="_blank" />
		 </div>}
            </div>
        )
    }
}

export default Chip
