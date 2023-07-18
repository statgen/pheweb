import React, { useEffect, useState } from "react";
import { wordFilter, createTableColumns, phenotypeListTableColumns } from '../../common/commonTableColumn'
import { ConfigurationWindow } from "../Configuration/configurationModel";
import commonLoading from "../../common/CommonLoading";
import { Phenotype } from "./../../common/commonModel";
import { getPhenotypes } from "./indexAPI";
import { mustacheDiv } from "../../common/commonUtilities";
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import { Column } from "react-table";
interface Props { }

declare let window: ConfigurationWindow;

const default_banner: string = ``

const index = window?.config?.userInterface?.index;

const tableColumns : Column<Phenotype>[] = createTableColumns(index?.table?.columns) || phenotypeListTableColumns as Column<Phenotype>[];
const defaultSorted = index?.table?.defaultSorted || [{
  id: 'num_gw_significant',
  desc: true,
}]
const banner: string = index?.banner || default_banner;



const tableProperties = {
  defaultFilterMethod : wordFilter
}

export const Table = (props: Props) => {

  const [phenotypes, setPhenotypes] = useState<Phenotype[] | null>(null);

  useEffect(() => { getPhenotypes(setPhenotypes); },[]);

  const filename = 'endpoints.tsv'
  const prop : DownloadTableProps<Phenotype[], Phenotype> = {
    filename,
    tableData : phenotypes,
    dataToTableRows : (data : Phenotype[]) => data,
    tableColumns  : tableColumns,
    tableProperties,
    defaultSorted
  }
  return phenotypes == null ? commonLoading: <div style={{ width : "100%"}}>
    {mustacheDiv(banner, [])}
    <CommonDownloadTable {...prop}/>
  </div>

};

export default Table;