import React, { useContext } from "react";
import { Column } from "react-table";
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import { Variant } from "../Variant/variantModel";
import { wordFilter, createTableColumns, variantTableColumns } from "../../common/commonTableColumn";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { VariantContext, VariantState } from "./VariantContext";
import commonLoading from "../../common/CommonLoading";
import { useState } from "react"

interface Props { variantData : Variant.Data, getSumstats : any }

const dataToTableRows = (colorByCategory : { [name: string]: string }) => (variantData : Variant.Data | null) : Variant.Result[] =>
  variantData?.results.map(v => { return {color : colorByCategory[v.category], variant: variantData?.variant, ...v}}) || []

declare let window: ConfigurationWindow;
const variant = window?.config?.userInterface?.variant;

const tableColumns : Column<Variant.Result>[] = createTableColumns(variant?.table?.columns) || (variantTableColumns as Column<Variant.Result>[])
const defaultSorted = variant?.table?.defaultSorted || [{
  id: 'pval',
  desc: false
}]

const tableProperties = {
  defaultFilterMethod : wordFilter
}

const VariantTable = ({ variantData, getSumstats } : Props ) => {
  const { colorByCategory } = useContext<Partial<VariantState>>(VariantContext);
  const tableData : Variant.Data = variantData;

  const getTrProps = (state, rowInfo, column) => {
    return {
      onClick: e => {
        if (rowInfo.original.mlogp === null && rowInfo.original.pval === null && rowInfo.original.beta == null){
          getSumstats(rowInfo.index, rowInfo.original.variant.varid, rowInfo.original.phenocode)
        }
      }
    }
  }

  const filename = `${variantData?.variant?.chr}_${variantData?.variant?.pos}_${variantData?.variant?.ref}_${variantData?.variant?.alt}_phenotype_associations.tsv`
  if(colorByCategory){
    const prop : DownloadTableProps<Variant.Data, Variant.Result> = {
      filename,
      tableData,
      dataToTableRows : dataToTableRows(colorByCategory),
      tableColumns ,
      tableProperties,
      defaultSorted : defaultSorted,
      getTrProps: getTrProps
    }
    return <CommonDownloadTable {...prop} />
  } else {
    return commonLoading
  }
}

export default  VariantTable
