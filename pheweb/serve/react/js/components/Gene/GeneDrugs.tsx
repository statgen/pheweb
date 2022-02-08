import { mustacheDiv } from "../../common/Utilities";
import React, { useContext, useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { getGeneDrugs } from "./geneAPI";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import loading from "../../common/Loading";
import { Column } from "react-table";
import { createTableColumns, geneDrugListTableColumns, variantTableColumns } from "../../common/tableColumn";
import { GeneDrugs} from "./geneModel";
import { GeneContext, GeneState } from "./GeneContext";

const default_banner: string = `
<h3>Drugs targeting Drug Name</h3>
`
declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.drugs?.banner || default_banner;

const { config : { userInterface } = { userInterface : undefined } } = window;
const tableColumns : Column<GeneDrugs.Row>[] = createTableColumns(userInterface?.gene?.drugs?.tableColumns) || (geneDrugListTableColumns as Column<GeneDrugs.Row>[])
const tableProperties = {
  defaultPageSize : 5
}
const dataToTableRows = (d : GeneDrugs.Data| null) : GeneDrugs.Row[] => d || []
const defaultSorted = [{
  id: 'pval',
  desc: false
}]


interface Props {}
const GeneDrugs = ({ } : Props) => {
  const { gene } = useContext<Partial<GeneState>>(GeneContext);
  const [geneDrugData, setGeneDrugData] = useState<GeneDrugs.Data | null>(null);

  useEffect(() => { getGeneDrugs(gene,setGeneDrugData) },[]);
  const filename = `${gene}_drugs.tsv`

  const prop : DownloadTableProps<GeneDrugs.Data, GeneDrugs.Row> = {
    filename,
    tableData : geneDrugData,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted
  }

  return geneDrugData == null ? loading: <div>
    {mustacheDiv(banner, [])}
    <DownloadTable {...prop}/>
  </div>
}

export default GeneDrugs