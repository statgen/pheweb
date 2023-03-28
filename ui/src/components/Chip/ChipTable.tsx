import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReactTable from "react-table-v6";
import { fetchData, setData, State } from "./features/chipTableSlice";
import { chipTableColumns, createTableColumns } from "../../common/commonTableColumn";
import { mustacheDiv } from "../../common/commonUtilities";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import commonLoading from "../../common/CommonLoading";


declare let window: ConfigurationWindow;
interface Props { match? : { params? : { data? : string } } }

const default_banner: string = "CHIP RESULTS"

export const Table = (props : Props) => {

  const dispatch = useDispatch();
  const data = useSelector<State, State | null>((state) => state.table);
  const [, setFilter] = useState([]);
  const reactTable = useRef(null);
  const { config } = window;

  const tableColumns = createTableColumns(config?.userInterface?.chip?.tableColumns) || chipTableColumns;
  const banner: string = config?.userInterface?.chip?.banner || default_banner;

  useEffect(() => {
    if (data?.status === "idle") {
      dispatch(fetchData(`/api/v1/chip_data`));
    } else {
      const stored = sessionStorage.getItem(`${props?.match?.params?.data}`);
      if (stored) {
        dispatch(setData(JSON.parse(stored)));
      } else if (data?.status !== "commonLoading") {
        dispatch(fetchData(`/api/v1/chip_data`));
      }
    }
  }, [props, data, dispatch]);

  return !data?.data ? commonLoading
        :
          <div style={{ width: "100%" }}>
              {mustacheDiv(banner, {})}

            <ReactTable
              ref={reactTable}
              data={data.data}
              filterable
              defaultFilterMethod={(filter : any, row : any) =>
                row[filter.id]
                  .toLowerCase()
                  .startsWith(filter.value.toLowerCase())
              }
              onFilteredChange={(filtered : any) => {
                setFilter(filtered);
              }}
              columns={tableColumns}
              defaultSorted={[ { id: "pval", desc: false } ]}
              defaultPageSize={20}
              className="-striped -highlight"
            />
            <p></p>
          </div>;

};
