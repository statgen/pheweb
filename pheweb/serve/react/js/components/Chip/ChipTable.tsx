import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import ReactTable from "react-table-v6";
import ReactTooltip from "react-tooltip";
import { fetchData, setData, State } from "./features/chipTableSlice";
import { chipTableColumns, createTableColumns } from "../../common/tableColumn";
import { mustacheDiv } from "../../common/Utilities";
import { ConfigurationWindow } from "../Configuration/ConfigurationModel";
import ReactDOMServer from "react-dom/server";
import loading from "../../common/Loading";

const default_banner: string =
  ReactDOMServer.renderToString(
    <p style={{ paddingBottom: "10px", textDecoration: "none", color: "black", width: "200px" }}>CHIP RESULTS</p>
  );

declare let window: ConfigurationWindow;
interface Props { match : { params : { data : string } } }
export const Table = (props : Props) => {

  const dispatch = useDispatch();
  const data = useSelector<State, State | null>((state) => state.table);
  const [, setFilter] = useState([]);
  const reactTable = useRef(null);
  const { config } = window;

  const banner: string = config?.userInterface?.chip?.banner || default_banner;
  const tableColumns = createTableColumns(config?.userInterface?.chip?.tableColumns) || chipTableColumns;

  useEffect(() => {
    if (data?.status == "idle") {
      dispatch(fetchData(`/api/v1/chip_data`));
    } else {
      const stored = sessionStorage.getItem(`${props.match.params.data}`);
      if (stored) {
        // console.log('cache hit')
        dispatch(setData(JSON.parse(stored)));
      } else if (data?.status != "loading") {
        dispatch(fetchData(`/api/v1/chip_data`));
      }
    }
  }, [props]);

  return (
    <div style={{ padding: "0" }}>
      {!data?.data ? loading
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
              onFilteredChange={(filtered) => {
                setFilter(filtered);
              }}
              columns={tableColumns}
              defaultSorted={[
                {
                  id: "pval",
                  desc: false
                }
              ]}
              defaultPageSize={20}
              className="-striped -highlight"
            />
            <p></p>
          </div>
        )}
    </div>
  );

};
