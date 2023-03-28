import React, { useEffect, useState } from "react";
import { LOF } from "./lofModel";
import { createTableColumns, LOFTableColumns } from "../../common/commonTableColumn";
import { Column } from "react-table";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import commonLoading from "../../common/CommonLoading";
import { getLOF } from "./lofAPI";

declare let window: ConfigurationWindow;
const lof = window?.config?.userInterface?.lof;

const dataToTableRows = (lofData : LOF.Data | null) : LOF.GeneData[] => lofData?.map(l => l.gene_data) || []
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
    body = commonLoading
  } else {
    const prop : DownloadTableProps<LOF.Data , LOF.GeneData> = {
      filename,
      tableData,
      dataToTableRows,
      tableColumns ,
      tableProperties,
      defaultSorted
    }
    body = <CommonDownloadTable {...prop} />
  }
  return body
}

export default LOFTable