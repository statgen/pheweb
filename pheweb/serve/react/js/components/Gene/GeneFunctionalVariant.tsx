import React, { useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { mustacheDiv } from "../../common/Utilities";
import { GeneDrugData, GeneDrugRow, GeneFunctionalVariantData, GeneFunctionalVariantRow } from "./geneModel";
import { getGeneDrugs, getGeneFunctionalVariants } from "./geneAPI";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import loading from "../../common/Loading";
import { Column } from "react-table";
import { createTableColumns, geneDrugListTableColumns, geneFunctionalVariantTableColumns } from "../../common/tableColumn";

const default_banner: string = `
<h3>All loss of function and missense variants</h3>
`

declare let window: ConfigurationWindow;
const { config } = window;
const { config : { userInterface } = { userInterface : undefined } } = window;

const banner: string = config?.userInterface?.gene?.functionalVariant?.banner || default_banner;

const dataToTableRows = (d : GeneFunctionalVariantData| null) : GeneFunctionalVariantRow[] => d == null? [] : d
const tableColumns : Column<GeneFunctionalVariantRow>[] = createTableColumns(userInterface?.gene?.functionalVariant?.tableColumns) || (geneFunctionalVariantTableColumns as Column<GeneFunctionalVariantRow>[])
const defaultSorted = [{
  id: 'pval',
  desc: false
}]
const tableProperties = {}


interface Props { gene : string }
const GeneFunctionalVariant = ({ gene } : Props) => {
  const [functionalVariant, setFunctionalVariant] = useState<GeneFunctionalVariantData | null>(null);

  useEffect(() => { getGeneFunctionalVariants(gene,setFunctionalVariant) },[]);
  console.log(functionalVariant);
  const prop : DownloadTableProps<GeneFunctionalVariantData, GeneFunctionalVariantRow> = {
    tableData : functionalVariant,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted
  }

  return functionalVariant == null ? loading: <div>
    {mustacheDiv(banner, [])}
    <DownloadTable {...prop}/>
  </div>
}

export default GeneFunctionalVariant;