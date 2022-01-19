import React from "react";
import { Column } from "react-table";
import DownloadTable, { DownloadTableProps  } from "../../common/DownloadTable";
import { VariantData , VariantRow } from "../Variant/variantModel";
import { createTableColumns, variantTableColumns } from "../../common/tableColumn";
import { ConfigurationWindow } from "../Configuration/configurationModel";


const dataToTableRows = (variantData : VariantData | null) : VariantRow[] => variantData?.phenos || []
declare let window: ConfigurationWindow;
const variant = window?.config?.userInterface?.variant;

const tableColumns : Column<VariantRow>[] = createTableColumns(variant?.table?.columns) || (variantTableColumns as Column<VariantRow>[])
const defaultSorted = variant?.table?.defaultSorted || [{
  id: 'pval',
  desc: true
}]

const tableProperties = {}

interface Props { variantData : VariantData }

const VariantTable = ({ variantData } : Props ) => {
  const tableData : VariantData = variantData;

  const filename = `${variantData.chrom}_${variantData.pos}_${variantData.ref}_${variantData.alt}_phenotype_associations.tsv`
  
  const prop : DownloadTableProps<VariantData, VariantRow> = {
      filename,
      tableData,
      dataToTableRows ,
      tableColumns ,
      tableProperties,
      defaultSorted
  }
  return <DownloadTable {...prop} />
}

export default  VariantTable