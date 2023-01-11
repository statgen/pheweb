import { mustacheDiv } from "../../common/Utilities";
import React, { useContext, useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { getGeneDrugs } from "./geneAPI";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import loading from "../../common/Loading";
import { Column } from "react-table";
import { createTableColumns, geneDrugListTableColumns } from "../../common/tableColumn";
import { GeneDrugs as GeneDrugsModel } from "./geneModel";
import { GeneContext, GeneState } from "./GeneContext";

const default_banner: string = `
<h3>Drugs targeting {{gene}}</h3>
`
declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.drugs?.banner || default_banner;

const { config : { userInterface } = { userInterface : undefined } } = window;
const tableColumns : Column<GeneDrugsModel.Row>[] = createTableColumns(userInterface?.gene?.drugs?.tableColumns) || (geneDrugListTableColumns as Column<GeneDrugsModel.Row>[])
const tableProperties = {
  defaultPageSize : 5
}
const dataToTableRows = (d : GeneDrugsModel.Data| null) : GeneDrugsModel.Row[] => d || []
const defaultSorted = [{
  id: 'pval',
  desc: false
}]


const GeneDrugs = () => {
  const { gene } = useContext<Partial<GeneState>>(GeneContext);
  const [geneDrugData, setGeneDrugData] = useState<GeneDrugsModel.Data | null>(null);

  useEffect(() => { getGeneDrugs(gene,setGeneDrugData) },[gene]);
  const filename = `${gene}_drugs.tsv`

  const prop : DownloadTableProps<GeneDrugsModel.Data, GeneDrugsModel.Row> = {
    filename,
    tableData : geneDrugData,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted
  }
  const context = { gene }

  return geneDrugData == null ? loading: <div>
    {mustacheDiv(banner, context)}
    <DownloadTable {...prop}/>
  </div>
}

export default GeneDrugs