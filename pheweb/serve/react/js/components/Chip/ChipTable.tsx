import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ReactTable from 'react-table-v6'
import ReactTooltip from 'react-tooltip'
import { fetchData, setData } from './features/tableSlice'
import { chipTableCols } from './tables.js'
import { mustacheDiv } from "../../common/Utilities";
import { ChipData } from "./ChipModel";
import { ConfigurationWindow } from "../Configuration/ConfigurationModel";

const default_banner: string = `
      <p style="paddingBottom: '10px', textDecoration: 'none', color: 'black', width: '200px'">CHIP RESULTS</p>
      `;
const loading_div = <div>.. . loading . ..</div>
export type State = {
  status: string;
  error: string | null;
  table: State | null;
} & Partial<ChipData>;

declare let window: ConfigurationWindow;

export const Table = (props) => {

    const dispatch = useDispatch()
    const data = useSelector<State, State | null>((state) => state.table)
    const [ , setFilter] = useState([])
    const reactTable = useRef(null)
    const { config } = window;

    const banner: string = config?.userInterface?.chip?.banner || default_banner;
    
    useEffect(() => {
	if (data?.status == 'idle') {
	    dispatch(fetchData(`/api/v1/chip_data`))
	} else {
	    const stored = sessionStorage.getItem(`${props.match.params.data}`)
	    if (stored) {
		    // console.log('cache hit')
	    	dispatch(setData(JSON.parse(stored)))
	    } else if (data?.status != 'loading') {
		dispatch(fetchData(`/api/v1/chip_data`))
	    }
	}
    }, [props])

    return (
      <div style={{ padding: "0" }}>
      {!data?.data ? loading_div      
	  :
	  (
        <div style={{ width: "100%" }}>
          <ReactTooltip html={true} />
          {mustacheDiv(banner, {})}
          <ReactTable
            ref={reactTable}
            data={data.data}
            filterable
            defaultFilterMethod={(filter, row) =>
              row[filter.id]
                .toLowerCase()
                .startsWith(filter.value.toLowerCase())
            }
            onFilteredChange={(filtered) => { setFilter(filtered); }}
            columns={chipTableCols}
            defaultSorted={[
              {
                id: "pval",
                desc: false,
              },
            ]}
            defaultPageSize={20}
            className="-striped -highlight"
          />
          <p></p>
        </div>
      )}
    </div>
  );

}
