import React from "react";
import {
  createTableColumns,
  phenotypeTableColumns, pValueSentinel,
} from "../../common/tableColumn";
import { ConfigurationUserInterface, ConfigurationWindow } from "../Configuration/configurationModel";
import { Column, Row, SortingRule } from "react-table";
import DownloadTable, { DownloadTableProps  } from "../../common/DownloadTable";
import { VariantData, VariantRow } from "./phenotypeModel";
import { getManhattan } from "./phenotypeAPI";

const defaultSorted = [{
  id: 'pval',
  desc: false
}]

const properties = {
  defaultPageSize : 20,
  className : "-striped -highlight",
  defaultFilterMethod : (filter : {id : string , value : string}, row : { [ key : string ] : string }) => row[filter.id].toLowerCase().includes(filter.value.toLowerCase())
}

const defaultColumns : Column<VariantRow>[] = phenotypeTableColumns as Column<VariantRow>[]

const processData = (phenocode : string,data  : VariantData) => {
  data.unbinned_variants.filter(variant => !!variant.annotation).forEach(variant => {
    variant.most_severe = variant.annotation.most_severe ? variant.annotation.most_severe.replace(/_/g, ' ').replace(' variant', '') : ''
    variant.info = variant.annotation.INFO
  })
  data.unbinned_variants.forEach(variant => { if (variant.pval == 0) variant.pval = pValueSentinel })
  //TODO server side
  data.unbinned_variants.forEach(variant => {
    // TODO naming af maf quickly
    if (variant.af_alt !== undefined && variant.maf === undefined) {
      variant.maf = variant.af_alt
      variant.maf_cases = variant.af_alt_cases
      variant.maf_controls = variant.af_alt_controls
      delete variant.af_alt
      delete variant.af_alt_cases
      delete variant.af_alt_controls
    }
    variant.phenocode = phenocode
    if (!variant.gnomad) {
      variant.fin_enrichment = -1
    } else if (variant.gnomad.AF_fin === 0) {
      variant.fin_enrichment = 0
    } else if (+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu'] == 0) {
      variant.fin_enrichment = 1e6
    } else {
      variant.fin_enrichment = +variant.gnomad['AC_fin'] / +variant.gnomad['AN_fin'] /
        ((+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu']) / (+variant.gnomad['AN_nfe_nwe'] + +variant.gnomad['AN_nfe_onf'] + +variant.gnomad['AN_nfe_seu']))
    }
  })
  return data
}

const fetchTableData = (phenotypeCode : string) => (handler : (data : VariantData| null) => void) => {
  getManhattan(phenotypeCode, (variantData : VariantData) => {
    handler(processData(phenotypeCode,variantData))
  })
}

const dataToTableRows = (data : VariantData| null) => data?.unbinned_variants?.filter(v => !!v.peak) || []
declare let window: ConfigurationWindow;

const { config : { userInterface } = { userInterface : undefined } } = window;
const tableColumns : Column<VariantRow>[] = createTableColumns(userInterface?.phenotype?.variantTable?.tableColumns) || phenotypeTableColumns as Column<VariantRow>[]

const prop = (phenotypeCode : string) : DownloadTableProps<VariantData, VariantRow> => {
  return {
      fetchTableData : fetchTableData(phenotypeCode) ,
      dataToTableRows ,
      tableColumns ,
      tableProperties: properties,
      defaultSorted
  }
}
interface Props { phenotype : string }
const VariantTable = ({ phenotype} : Props ) =>
  <div>
    <DownloadTable { ... prop(phenotype) } />
  </div>
export default VariantTable