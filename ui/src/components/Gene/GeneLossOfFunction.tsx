import React, { useContext, useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { mustacheDiv } from "../../common/commonUtilities";
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import { LossOfFunction } from "./geneModel";
import { getLossOfFunction } from "./geneAPI";
import { Column } from "react-table";
import { wordFilter, createTableColumns, geneLossOfFunctionTableColumns } from "../../common/commonTableColumn";
import commonLoading from "../../common/CommonLoading";
import { GeneContext, GeneState } from "./GeneContext";


const default_banner : string =`
<div class="row">
  <div class="col-md-10 col-lg-10 col-sm-10 col-xs-10">
    <h3>Loss of function burden</h3>
  </div>
</div>
`

const default_empty: string =`                                                                                                              
    No loss of function variants for {{gene}}                                                                                               
  `

const defaultSorted = [{
  id: 'pval',
  desc: false
}]
const tableProperties = {
  defaultPageSize : 5,
  defaultFilterMethod : wordFilter
}


declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.lossOfFunction?.banner || default_banner;
const empty: string = config?.userInterface?.gene?.lossOfFunction?.empty || default_empty;

interface Props { }

const reshapeRow = (d : LossOfFunction.Row) : LossOfFunction.ViewRow => {
  const phenostring  = d.gene_data.phenostring
  const phenocode : string = d.gene_data.pheno

  const variants : string = d.gene_data.variants
  const pval: number = +d.gene_data.p_value
  const beta : number = +d.gene_data.beta

  const alt_count_cases: number = +d.gene_data.alt_count_cases
  const alt_count_ctrls: number = +d.gene_data.alt_count_ctrls

  const ref_count_cases: number = +d.gene_data.ref_count_cases
  const ref_count_ctrls: number = +d.gene_data.ref_count_ctrls
  return {
    phenostring,
    phenocode,

    variants,
    pval,
    beta,

    alt_count_cases,
    alt_count_ctrls,

    ref_count_cases,
    ref_count_ctrls,

  }
}
const dataToTableRows = (d : LossOfFunction.Data| null) :  LossOfFunction.ViewRow[] => d == null? [] : d.map(reshapeRow)
const tableColumns : Column<LossOfFunction.ViewRow>[] = createTableColumns<LossOfFunction.ViewRow>(config?.userInterface?.gene?.lossOfFunction?.tableColumns) || (geneLossOfFunctionTableColumns as Column<LossOfFunction.ViewRow>[])


const GeneLossOfFunction = () => {
  const { gene } = useContext<Partial<GeneState>>(GeneContext);
  const [data, setData] = useState<LossOfFunction.Data | null>(null);
  useEffect(() => {
    /* test data setData(r4_api_lof_ABO) */
    getLossOfFunction(gene,setData)
  },[gene, setData]);

  const filename = `${gene}_lof.tsv`
  const prop : DownloadTableProps<LossOfFunction.Data, LossOfFunction.ViewRow> = {
    filename,
    tableData : data,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted
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

export default GeneLossOfFunction