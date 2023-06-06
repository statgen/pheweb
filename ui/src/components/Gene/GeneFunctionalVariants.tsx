import React, { useContext, useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import {defaultEmptyArray, flatten, mustacheDiv} from '../../common/commonUtilities';
import { FunctionalVariants } from './geneModel';
import { getGeneFunctionalVariants } from "./geneAPI";
import { Column } from "react-table";
import {
  wordFilter,
  createTableColumns,
  geneFunctionalVariantTableColumns,
  finnGenPhenotypeSubsetValues,
} from '../../common/commonTableColumn';
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import commonLoading from "../../common/CommonLoading";
import { finEnrichmentLabel } from "../Finngen/finngenGnomad";
import { GeneContext, GeneState } from "./GeneContext";
import ViewRow = FunctionalVariants.ViewRow;

const default_banner : string =`
<div class="row">
  <div class="col-md-10 col-lg-10 col-sm-10 col-xs-10">
    <h3>All loss of function and missense variants</h3>
  </div>
</div>
`
const default_empty: string =`                                                                                                              
    No functional or missense variants for {{gene}}                                                                                               
  `

declare let window: ConfigurationWindow;
const config = window?.config?.userInterface?.gene?.functionalVariants;
const banner: string = config?.banner || default_banner;
const empty: string = config?.empty || default_empty;

const tableColumns : Column<FunctionalVariants.ViewRow>[] = createTableColumns<FunctionalVariants.ViewRow>(config?.tableColumns) || (geneFunctionalVariantTableColumns as Column<FunctionalVariants.ViewRow>[])
const defaultSorted =[]

const tableProperties = {
  defaultPageSize : 5,
  defaultFilterMethod : wordFilter
}
const reshapeRow = (r : FunctionalVariants.Row) : FunctionalVariants.ViewRow => {
  const rsids = r.rsids
  const alt = r.var.alt
  const chrom = r.var.chr
  const pos = r.var.pos
  const ref = r.var.ref
  const most_severe = r.var.annotation.annot.most_severe.replace(/_/g, ' ').replace(' variant', '')
  const info = r.var.annotation.annot.INFO
  const maf = +r.var.annotation.annot.AF < 0.5 ? +r.var.annotation.annot.AF : 1 - +r.var.annotation.annot.AF
  const fin_enrichment = finEnrichmentLabel(r.var.annotation.gnomad)
  const significant_phenos = r.significant_phenos

  return { rsids , alt , chrom , pos , ref , most_severe , info , maf , fin_enrichment , significant_phenos }
}
const dataToTableRows = (data : FunctionalVariants.Data) : FunctionalVariants.ViewRow[] => data.map(reshapeRow);

/* Create a row for significant_phenos when
 * downloading.
 */
const tableRowToDownloadRow = (columns : ViewRow[]) => flatten(columns.map(x => defaultEmptyArray(finnGenPhenotypeSubsetValues<FunctionalVariants.SignificantPheno>(x.significant_phenos),[x]).map(p => {  return { ...x, ...p}})   ));

interface Props { }
const GeneFunctionalVariants = () => {
  const { gene } = useContext<Partial<GeneState>>(GeneContext);
  const [data, setData] = useState<FunctionalVariants.Data | null>(null);
  const filename = `${gene}_functional_variants.tsv`
  useEffect(() => {
    getGeneFunctionalVariants(gene,setData)
  },[gene, setData]);
  
  const prop : DownloadTableProps<FunctionalVariants.Data, FunctionalVariants.ViewRow> = {
    filename,
    tableData : data,
    dataToTableRows ,
    tableColumns ,
    tableProperties,
    defaultSorted,
    tableRowToDownloadRow
  }
  const context = { gene }

  let view;
  if (data == null){
    view = commonLoading;
  } else if(dataToTableRows(data).length === 0){
    view = <div>
      {mustacheDiv(banner, context)}
      {mustacheDiv(empty, context)}

    </div>
  } else {
    view = <div>
      {mustacheDiv(banner, context)}
      <CommonDownloadTable {...prop}/>
    </div>
  }
  return view;

}

export default GeneFunctionalVariants