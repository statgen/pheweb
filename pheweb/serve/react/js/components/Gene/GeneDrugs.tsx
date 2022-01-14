import { mustacheDiv } from "../../common/Utilities";
import React, { useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { GeneDrugData, GeneDrugRow, MyGeneInformation } from "./geneModel";
import { getGeneDrugs, getMyGeneInformation } from "./geneAPI";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import loading from "../../common/Loading";
import { VariantData, VariantRow } from "../Variant/variantModel";
import { Column } from "react-table";
import { createTableColumns, geneDrugListTableColumns, variantTableColumns } from "../../common/tableColumn";

const default_banner: string = `
<h3>Drugs targeting Drug Name</h3>
`
declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.drugs?.banner || default_banner;

const { config : { userInterface } = { userInterface : undefined } } = window;
const tableColumns : Column<GeneDrugRow>[] = createTableColumns(userInterface?.gene?.drugs?.tableColumns) || (geneDrugListTableColumns as Column<GeneDrugRow>[])
const tableProperties = {}
const dataToTableRows = (d : GeneDrugData| null) : GeneDrugRow[] => d || []
const defaultSorted = [{
  id: 'pval',
  desc: false
}]


interface Props { gene : string }
const GeneDrugs = ({ gene } : Props) => {
  const [geneDrugData, setGeneDrugData] = useState<GeneDrugData | null>(null);

  useEffect(() => { getGeneDrugs(gene,setGeneDrugData) },[]);

  const prop : DownloadTableProps<GeneDrugData, GeneDrugRow> = {
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