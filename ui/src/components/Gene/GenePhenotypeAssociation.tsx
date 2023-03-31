import React, { useContext } from "react";
import { mustacheDiv } from "../../common/commonUtilities";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { GenePhenotypes } from "./geneModel";
import { Column } from "react-table";
import { wordFilter, createTableColumns, genePhenotypeTableColumns } from "../../common/commonTableColumn";
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import { finEnrichmentLabel } from "../Finngen/finngenGnomad";
import commonLoading from "../../common/CommonLoading";
import { GeneContext, GeneState } from "./GeneContext";
import GenePhenotypeAssociationSelected from "./GenePhenotypeAssociationSelected";
import "./gene.css";


const default_banner: string = `
<div class="row">
  <div class="col-md-10 col-lg-10 col-sm-10 col-xs-10">
    <h3>Association results</h3>
  </div>
</div>
`


declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.phenotype?.banner || default_banner;


const tableColumns : Column<GenePhenotypes.ViewRow>[] = createTableColumns<GenePhenotypes.ViewRow>(config?.userInterface?.gene?.phenotype?.tableColumns) || (genePhenotypeTableColumns as Column<GenePhenotypes.ViewRow>[])
const defaultSorted = [{
  id: 'pval',
  desc: false
}]

interface  Props {}

const reshapeRow =
  (gene : string) =>
  (d : GenePhenotypes.Phenotype) : GenePhenotypes.ViewRow => {
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

  return  { chrom, pos, ref, alt , num_cases, beta, pval ,
            rsids , mlogp , phenostring , category ,
            fin_enrichment , phenocode , gene}
}

const dataToTableRows =
  (gene : string) =>
  (d : GenePhenotypes.Data| null) :  GenePhenotypes.ViewRow[] =>
  d == null? [] : d.phenotypes.map(reshapeRow(gene))

const GenePhenotypeAssociation = () => {
  const { genePhenotype , gene , selectedPhenotype} = useContext<Partial<GeneState>>(GeneContext);
  const filename =  `${gene}_top_associations`
  const tableProperties = {
    defaultFilterMethod : wordFilter,
    getTrProps : (state, rowInfo, column) => {
      if (rowInfo !== undefined && rowInfo?.original?.phenocode === selectedPhenotype?.pheno?.phenocode) {
        return { className: 'geneSelectedRow' }
      } else {
        return { className: 'geneNonSelectedRow' }
      }
    },
    defaultPageSize : 5
  }
  const prop : DownloadTableProps<GenePhenotypes.Data, GenePhenotypes.ViewRow> = {
    filename,
    tableData : genePhenotype,
    dataToTableRows : dataToTableRows(gene),
    tableColumns ,
    tableProperties,
    defaultSorted
  }
  let view

  if(genePhenotype == null || genePhenotype === undefined || selectedPhenotype === undefined){
    view = commonLoading
  } else {
    view = <React.Fragment>
      { mustacheDiv(banner, { }) }
      <CommonDownloadTable {...prop  }/>
      <GenePhenotypeAssociationSelected/>
    </React.Fragment>
  }
  return view
}

export default GenePhenotypeAssociation