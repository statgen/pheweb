import React, { useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { mustacheDiv } from "../../common/Utilities";
import { GeneLOFData, GeneLOFRow } from "./geneModel";
import { createTableColumns, geneLOFTableColumns } from "../../common/tableColumn";
import { Column } from "react-table";
import { getGenePhenotypes } from "./geneAPI";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import loading from "../../common/Loading";

const default_banner: string = `
<h3>Loss of function burden</h3>
`
const default_empty: string =`
    No loss of function variants for {{gene}}
  `

declare let window: ConfigurationWindow;
const { config } = window;
const { config : { userInterface } = { userInterface : undefined } } = window;
const banner: string = config?.userInterface?.gene?.lof?.banner || default_banner;
const empty: string = config?.userInterface?.gene?.lof?.empty || default_empty;

const dataToTableRows = (d : GeneLOFData| null) :  GeneLOFRow[] => d == null? [] : d

const tableColumns : Column<GeneLOFRow>[] = createTableColumns(userInterface?.gene?.lof?.tableColumns) || (geneLOFTableColumns as Column<GeneLOFRow>[])
const defaultSorted = [{
  id: 'pval',
  desc: false
}]
const tableProperties = {}

interface Props { gene : string }
const GeneLOF = ({ gene } : Props) => {
  const [phenotypeData, setPhenotypeData] = useState<GeneLOFData | null>(null);

  useEffect(() => { getGenePhenotypes(gene,setPhenotypeData) },[]);
  const prop : DownloadTableProps<GeneLOFData, GeneLOFRow> = {
    tableData : phenotypeData,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted
  }
  let context = { gene }
  let view;
  if (phenotypeData == null){
    view = loading;
  } else if(dataToTableRows(phenotypeData).length == 0){
    view = <div>
      {mustacheDiv(banner, context)}
      {mustacheDiv(empty, context)}

    </div>
  } else {
    view = <div>
      {mustacheDiv(banner, context)}
      <DownloadTable {...prop}/>
    </div>
  }
  return view;
}
export default GeneLOF;