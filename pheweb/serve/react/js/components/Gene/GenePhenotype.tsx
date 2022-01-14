import { mustacheDiv } from "../../common/Utilities";
import React, { useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import {
  GeneAnnotation,
  GeneFunctionalVariantData,
  GeneFunctionalVariantRow,
  GenePhenotypeData,
  GenePhenotypeRow
} from "./geneModel";
import { Column } from "react-table";
import {
  createTableColumns,
  geneFunctionalVariantTableColumns,
  genePhenotypeTableColumns
} from "../../common/tableColumn";
import { getGeneFunctionalVariants, getGenePhenotypes } from "./geneAPI";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import loading from "../../common/Loading";

const default_banner: string = `
<h3>Association results</h3>
This table contains for each phenotype the top associated variant in the gene
`
declare let window: ConfigurationWindow;
const { config } = window;
const { config : { userInterface } = { userInterface : undefined } } = window;

const banner: string = config?.userInterface?.gene?.associationResults?.banner || default_banner;

const dataToTableRows = (d : GenePhenotypeData| null) :  GenePhenotypeRow[] => d == null? [] : d
const tableColumns : Column<GenePhenotypeRow>[] = createTableColumns(userInterface?.gene?.genePhenotype?.tableColumns) || (genePhenotypeTableColumns as Column<GenePhenotypeRow>[])

interface Props { }
const GenePhenotype = (props : Props) => {
  {mustacheDiv(banner, [])}
  return <div>
  </div>
}

const defaultSorted = [{
  id: 'pval',
  desc: false
}]
const tableProperties = {}


interface Props { gene : string }
const GeneFunctionalVariant = ({ gene } : Props) => {
  const [phenotypeData, setPhenotypeData] = useState<GenePhenotypeData | null>(null);

  useEffect(() => { getGenePhenotypes(gene,setPhenotypeData) },[]);
  const prop : DownloadTableProps<GenePhenotypeData, GenePhenotypeRow> = {
    tableData : phenotypeData,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted
  }

  return phenotypeData == null ? loading: <div>
    {mustacheDiv(banner, [])}
    <DownloadTable {...prop}/>
  </div>
}




export default GenePhenotype;