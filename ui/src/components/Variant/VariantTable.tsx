import React, { useContext } from "react";
import { Column } from "react-table";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";
import { Variant } from "../Variant/variantModel";
import { wordFilter, createTableColumns, variantTableColumns } from "../../common/tableColumn";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { VariantContext, VariantState } from "./VariantContext";
import loading from "../../common/Loading";

const dataToTableRows = (colorByCategory : { [name: string]: string }) => (variantData : Variant.Data | null) : Variant.Result[] =>
  variantData?.results.map(v => { return {color : colorByCategory[v.category], ...v}}) || []
declare let window: ConfigurationWindow;
const variant = window?.config?.userInterface?.variant;

const tableColumns : Column<Variant.Result>[] = createTableColumns(variant?.table?.columns) || (variantTableColumns as Column<Variant.Result>[])
const defaultSorted = variant?.table?.defaultSorted || [{
  id: 'category_index',
  desc: false
}]

const tableProperties = {
  defaultFilterMethod : wordFilter
}

interface Props { variantData : Variant.Data }

const VariantTable = ({ variantData } : Props ) => {
  const { colorByCategory } = useContext<Partial<VariantState>>(VariantContext);
  const tableData : Variant.Data = variantData;

  const filename = `${variantData?.variant?.chr}_${variantData?.variant?.pos}_${variantData?.variant?.ref}_${variantData?.variant?.alt}_phenotype_associations.tsv`
  if(colorByCategory){
    const prop : DownloadTableProps<Variant.Data, Variant.Result> = {
      filename,
      tableData,
      dataToTableRows : dataToTableRows(colorByCategory),
      tableColumns ,
      tableProperties,
      defaultSorted
    }
    return <DownloadTable {...prop} />
  } else {
    return loading
  }
}

export default  VariantTable