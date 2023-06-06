import React, { ReactElement, useEffect, useState } from "react";
import ReactTable from "react-table-v6";
import commonLoading from "./CommonLoading";
import { createCSVLinkHeaders } from "./commonTableColumn";
import { CSVLink } from "react-csv";
import { Column, SortingRule } from "react-table";


/* Abstraction is broken here see:
 * https://stackoverflow.com/questions/53504924/reactjs-download-csv-file-on-button-click
 */
interface Link extends HTMLAnchorElement { link : HTMLAnchorElement }
interface Table<RowType> extends  JSX.Element { getResolvedState : () => { sortedData : RowType[] } }

export interface Props <TableData, RowType extends  {},
                        ReactProperties extends {} = {},
                        LinkProperties extends {} = {}>{
  filename : string
  tableData : (TableData| null)
  dataToTableRows : (data : TableData| null) => RowType[]
  tableColumns : Column<RowType>[]
  tableProperties? : ReactProperties,
  linkProperties? : LinkProperties,
  defaultSorted : SortingRule<string>[],
  subComponent? : ( JSX.Element | any ),
  tableRowToDownloadRow? : (columns : RowType[]) => RowType[] /* default to identity */
}

export type DownloadTableProps<TableData,
                               RowType extends  {},
                               ReactProperties extends {} = {}> = Props<TableData, RowType, ReactProperties>

const CommonDownloadTable = <TableData,RowType extends {}>
  ({ filename,
     tableData,
     dataToTableRows ,
     tableColumns ,
     tableProperties,
     linkProperties,
     defaultSorted,
     subComponent,
     tableRowToDownloadRow = (columns) => columns
   } : Props<TableData, RowType>) => {

    const [download, setDownload] = useState<RowType[] | null>(null);
    const [reactTableRef, setReactTableRef] = useState<Table<RowType> | null>(null);
    const [link, setLink] = useState<Link | null>(null);

   /* Using an effect because the data in tsv wasn't populated
    * when the link was clicked.
    */
    useEffect(() => { download && link && link.link.click() },[download,link]);

    const downloadHandler = () => {
      if (reactTableRef != null) {
        setDownload(tableRowToDownloadRow(reactTableRef.getResolvedState().sortedData))
      }
    }
    const body = <div>
      <ReactTable
        ref={setReactTableRef}
        data={dataToTableRows(tableData)}
        filterable
        columns={tableColumns}
        defaultSorted={defaultSorted}
        SubComponent={subComponent}
        {...tableProperties  } />

      <p>

      </p>
      <div className="row">
        <div className="col-xs-12">
          <div className="btn btn-primary" onClick={downloadHandler}>Download table</div>
        </div>
      </div>

      <CSVLink
        headers={createCSVLinkHeaders(tableColumns)}
        data={download == null ? [] : download }
        separator={"\t"}
        enclosingCharacter={""}
        filename={ filename }
        className="hidden"
        ref={(r) => setLink(r)}
        target="_blank"
        {...(linkProperties && {linkProperties : linkProperties})}
      />
    </div>
    const component = tableData == null? commonLoading : body;
    return component;
}

export default CommonDownloadTable
