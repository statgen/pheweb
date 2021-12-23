import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ReactTable from 'react-table-v6'
import ReactTooltip from 'react-tooltip'
import { fetchData, setData } from './tableSlice'
import { chipTableCols } from '../tables.js'

export const Table = (props) => {

    const dispatch = useDispatch()
    const data = useSelector(state => state.table)
    const [filt, setFilt] = useState([])
    const reactTable = useRef(null)

    useEffect(() => {
	if (data.status == 'idle') {
	    dispatch(fetchData(`/api/v1/chip_data`))
	} else {
	    const stored = sessionStorage.getItem(`${props.match.params.data}`)
	    if (stored) {
		    // console.log('cache hit')
	    	dispatch(setData(JSON.parse(stored)))
	    } else if (data.status != 'loading') {
		dispatch(fetchData(`/api/v1/chip_data`))
	    }
	}
    }, [props])

    return (
	<div style={{padding: '0'}}>
		    <div dangerouslySetInnerHTML={{__html: window.chip_content}}>
		    </div>
		{!data.data ?
		 <div>.. . loading . ..</div> :
		 <div style={{width: '100%'}}>
		 <ReactTooltip html={true} />
		 <div>These are association results of 182,965 rare coding variants (MAF &lt; 0.01) genotyped on the FinnGen chip (268,094 samples analyzed, data freeze 8)</div>
		 <div>Associations with p &lt; 1e-5 are shown</div><br/>
		 <div>Hover over a variant id to see that variant's cluster plot</div>
		 <div>Hover over column names for more info</div>
		 <div>Click a phenotype to get to FinnGen browser, variant id to get to gnomAD, an rsid to get to dbSNP, a gene to get to OMIM</div><br/>
		 <ReactTable
		 ref={reactTable}
		 data={data.data}
		 filterable 
		 defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase())}
		 onFilteredChange={filtered => { setFilt(filtered) }}
		 columns={chipTableCols}
		 defaultSorted={[{
		     id: "pval",
		     desc: false
		 }]}
		 defaultPageSize={20}
		 className="-striped -highlight"
		 />
		 <p></p>
		 </div>}
            </div>
        )
}
