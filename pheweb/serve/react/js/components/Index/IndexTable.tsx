import React, { useEffect, useState } from "react";
import { createTableColumns, phenotypeListTableColumns } from "../../common/tableColumn";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import loading from "../../common/Loading";
import { Phenotype } from "./indexModel";
import { getPhenotypes } from "./indexAPI";
import { mustacheDiv } from "../../common/Utilities";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import { Column } from "react-table";

interface Props { }

declare let window: ConfigurationWindow;

/* Abstraction is broken here see:
 * https://stackoverflow.com/questions/53504924/reactjs-download-csv-file-on-button-click
 */
interface Link extends HTMLAnchorElement { link : HTMLAnchorElement }

const default_banner: string = ``

const { config } = window;
const tableColumns : Column<Phenotype>[] = createTableColumns(config?.userInterface?.index?.tableColumns) || phenotypeListTableColumns as Column<Phenotype>[];
const defaultSorted = [{
  id: 'phenotype',
  desc: false
}]

const tableProperties = {}

export const Table = (props: Props) => {

  const [phenotypes, setPhenotypes] = useState<Phenotype[] | null>(null);
  const banner: string = config?.userInterface?.index?.banner || default_banner;

  useEffect(() => { getPhenotypes(setPhenotypes); },[]);

  const prop : DownloadTableProps<Phenotype[], Phenotype> = {
    tableData : phenotypes,
    dataToTableRows : (data : Phenotype[]) => data,
    tableColumns  : tableColumns,
    tableProperties,
    defaultSorted
  }

  return phenotypes == null ? loading: <div>
    {mustacheDiv(banner, [])}
    <DownloadTable {...prop}/>
  </div>

};

export default Table;