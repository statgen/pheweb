import React, { useEffect, useState } from "react";
import { LOF } from "./lofModel";
import { createTableColumns, LOFTableColumns } from "../../common/tableColumn";
import { Column } from "react-table";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import loading from "../../common/Loading";
import { getLOF } from "./lofAPI";

interface Props {}
declare let window: ConfigurationWindow;
const lof = window?.config?.userInterface?.lof;

const dataToTableRows = (lofData : LOF.Data | null) : LOF.GeneData[] => lofData?.map(l => l.gene_data)
const tableColumns : Column<LOF.GeneData>[] = createTableColumns(lof?.table?.columns) || (LOFTableColumns as Column<LOF.GeneData>[])
const defaultSorted = lof?.table?.defaultSorted || [{
  id: 'pval',
  desc: false
}]

const tableProperties = {}

const LOFTable = () => {
  const filename = 'lof_burden.tsv'
  const [tableData, setTableData] = useState<LOF.Data | null>(null);
  useEffect(() => {
    getLOF(setTableData)
  },[setTableData]);


  let body
  if(tableData == null) {
    body = loading
  } else {
    const prop : DownloadTableProps<LOF.Data , LOF.GeneData> = {
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

export default LOFTable