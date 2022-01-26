import React, { useEffect, useState } from "react";
import { mustacheDiv } from "../../common/Utilities";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { GenePhenotypes } from "./geneModel";
import { getGenePhenotypes } from "./geneAPI";
import { Column } from "react-table";
import { createTableColumns, genePhenotypeTableColumns } from "../../common/tableColumn";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import { finEnrichmentLabel } from "../Finngen/gnomad";
import loading from "../../common/Loading";
import Lavaa from "./Lava/lavaa";

const default_banner: string = `
<div class="row">
  <div class="col-md-10 col-lg-10 col-sm-10 col-xs-10">
    <h3>Association results</h3>
  </div>
</div>
`

const default_footer: string = `
{{#topHit}}
<div class="row">
    <div class="pheno-info col-xs-12">
      <p style="margin-bottom: 0"><b>{{assoc.phenostring}}</b></p>
          <p style="margin-bottom: 0"><b>{{assoc.n_case}}</b> cases, <b>{{assoc.n_control}}</b> controls</p>
          <p style="margin-bottom: 0">{{assoc.category}}</p>
    </div>
</div>
{{/topHit}}
`

declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.phenotype?.banner || default_banner;
const footer : string = config?.userInterface?.gene?.phenotype?.footer || default_footer;


const tableColumns : Column<GenePhenotypes.ViewRow>[] = createTableColumns<GenePhenotypes.ViewRow>(config?.userInterface?.gene?.phenotype?.tableColumns) || (genePhenotypeTableColumns as Column<GenePhenotypes.ViewRow>[])
const defaultSorted = [{
  id: 'pval',
  desc: false
}]
const tableProperties = {
  defaultPageSize : 5
}

interface  Props {
  gene : string
}

const reshapeRow = (d : GenePhenotypes.Row) : GenePhenotypes.ViewRow => {
  const rsids = d.variant.annotation.rsids
  const mlogp = d.assoc.mlogp
  const phenostring = d.assoc.phenostring
  const phenocode = d.assoc.phenocode
  const category = d.pheno.category
  const pval = d.assoc.pval
  const fin_enrichment = finEnrichmentLabel(d.variant.annotation.gnomad)
  const beta = d.assoc.beta
  const num_cases = d.assoc.n_case

  const chrom = d.variant.chr
  const pos = d.variant.pos
  const ref = d.variant.ref
  const alt = d.variant.alt

  return  { chrom, pos, ref, alt , num_cases, beta, pval , rsids , mlogp , phenostring , category ,fin_enrichment , phenocode }
}
const dataToTableRows = (d : GenePhenotypes.Data| null) :  GenePhenotypes.ViewRow[] => d == null? [] : d.map(reshapeRow)

const getTopHit = (d : GenePhenotypes.Data| null) :  GenePhenotypes.Row | null =>
  d?.reduce((acc, current) => acc == null?current: (acc.assoc.mlogp > current.assoc.mlogp ?acc : current), null)

const GenePhenotypeAssociation = ({ gene } : Props) => {
  const [data, setData] = useState<GenePhenotypes.Data | null>(null);
  useEffect(() => { getGenePhenotypes(gene,setData) },[]);
  const filename =  `${gene}_top_associations`
  const prop : DownloadTableProps<GenePhenotypes.Data, GenePhenotypes.ViewRow> = {
    filename,
    tableData : data,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted
  }
  const context = { topHit : getTopHit(data)}
  let view

  if(data == null){
    view = loading
  } else {
    view = <React.Fragment>
      <Lavaa dataprop={data.map(d => d.assoc)}/>
      { mustacheDiv(banner, { }) }
      <DownloadTable {...prop  }/>
      { mustacheDiv(footer, context) }
    </React.Fragment>
  }
  return view
}

export default GenePhenotypeAssociation