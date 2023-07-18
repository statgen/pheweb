import React, { useContext, useEffect, useState } from "react";
import { createTableColumns, phenotypeBinaryTableColumns , phenotypeQuantitativeTableColumns , pValueSentinel } from "../../common/commonTableColumn";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { Column } from "react-table";
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import { PhenotypeVariantData, PhenotypeVariantRow } from "./phenotypeModel";
import { getManhattan } from "./phenotypeAPI";
import { PhenotypeContext, PhenotypeState } from "./PhenotypeContext";

const defaultSorted = [{
  id: 'pval',
  desc: false
}]

const tableProperties = {
  defaultPageSize : 20,
  className : "-striped -highlight",
  defaultFilterMethod : (filter : {id : string , value : string}, row : { [ key : string ] : string }) => row[filter.id].toLowerCase().includes(filter.value.toLowerCase())
}

const processData = (phenocode : string,data  : PhenotypeVariantData) => {
  data.unbinned_variants.filter(variant => !!variant.annotation).forEach(variant => {
    variant.most_severe = variant.annotation.most_severe ? variant.annotation.most_severe.replace(/_/g, ' ').replace(' variant', '') : ''
    variant.info = variant.annotation.INFO
  })
  data.unbinned_variants.forEach(variant => { if (variant.pval === 0) variant.pval = pValueSentinel })
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
    } else if (+variant.gnomad.AF_fin === 0) {
      variant.fin_enrichment = 0
    } else if (+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu'] === 0) {
      variant.fin_enrichment = 1e6
    } else {
      variant.fin_enrichment = +variant.gnomad['AC_fin'] / +variant.gnomad['AN_fin'] /
        ((+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu']) / (+variant.gnomad['AN_nfe_nwe'] + +variant.gnomad['AN_nfe_onf'] + +variant.gnomad['AN_nfe_seu']))
    }
  })
  return data
}

const dataToTableRows = (data : PhenotypeVariantData| null) => data?.unbinned_variants?.filter(v => !!v.peak) || []
declare let window: ConfigurationWindow;

const variant = window?.config?.userInterface?.phenotype?.variant;

const quantitativeTableColumns : Column<PhenotypeVariantRow>[] = createTableColumns<PhenotypeVariantRow>(variant?.quantitative?.table?.columns) || phenotypeQuantitativeTableColumns as Column<PhenotypeVariantRow>[];
const binaryTableColumns : Column<PhenotypeVariantRow>[] = createTableColumns<PhenotypeVariantRow>(variant?.binary?.table?.columns) || phenotypeBinaryTableColumns as Column<PhenotypeVariantRow>[];

interface Props { phenotypeCode : string }
const PhenotypeVariantTable = () => {
  const {  phenotype , phenotypeCode } = useContext<Partial<PhenotypeState>>(PhenotypeContext);
  const [tableData, setTableData] = useState<PhenotypeVariantData| null>(null);

  useEffect(() => {
    phenotypeCode !=null &&
    getManhattan(phenotypeCode, (variantData : PhenotypeVariantData) => {
      setTableData(processData(phenotypeCode,variantData))
    })
    },[phenotypeCode, setTableData]);

  const tableColumns = phenotype.is_binary == false?quantitativeTableColumns : binaryTableColumns;

  const filename : string = `${phenotypeCode}.tsv`
  const props : DownloadTableProps<PhenotypeVariantData, PhenotypeVariantRow>  = {
    filename,
    tableData,
    dataToTableRows,
    tableColumns,
    tableProperties,
    defaultSorted  }
  return <div>
    <CommonDownloadTable {...props} />
  </div>
}
export default PhenotypeVariantTable