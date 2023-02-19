import { ConfigurationWindow } from "../Configuration/configurationModel";
import { Coding } from "./codingModel";
import { CodingTableColumns, createTableColumns } from "../../common/tableColumn";
import { Column } from "react-table";
import React, { useEffect, useState } from "react";
import loading from "../../common/Loading";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import { getCoding } from "./codingAPI";

declare let window: ConfigurationWindow
const coding = window?.config?.userInterface?.coding

const dataToTableRows = (chipData : Coding.Data | null) : Coding.Row[] => chipData || []
const tableColumns : Column<Coding.Row>[] = createTableColumns(coding?.table?.columns) || (CodingTableColumns as Column<Coding.Row>[])
const defaultSorted = coding?.table?.defaultSorted || [{
  id: 'pval',
  desc: false
}]

const tableProperties = {}

const CodingTable = () => {
  const filename = 'lof_burden.tsv'
  const [tableData, setTableData] = useState<Coding.Data | null>(null)
  useEffect(() => {
    getCoding(setTableData)
  },[setTableData])


  let body
  if(tableData == null) {
    body = loading
  } else {
    const prop : DownloadTableProps<Coding.Data , Coding.Row> = {
      filename,
      tableData,
      dataToTableRows,
      tableColumns ,
      tableProperties,
      defaultSorted
    }
    body = <DownloadTable {...prop} />
  }
  return body
}

export default CodingTable
