import React, { useEffect, useState } from "react";
import { wordFilter, createTableColumns, phenotypeListTableColumns } from '../../common/tableColumn'
import { ConfigurationWindow } from "../Configuration/configurationModel";
import loading from "../../common/Loading";
import { Phenotype } from "./indexModel";
import { getPhenotypes } from "./indexAPI";
import { mustacheDiv } from "../../common/Utilities";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
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
  return phenotypes == null ? loading: <div style={{ width : "100%"}}>
    {mustacheDiv(banner, [])}
    <DownloadTable {...prop}/>
  </div>

};

export default Table;