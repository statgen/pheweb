import React from "react";
import { Column } from "react-table";
import DownloadTable, { DownloadTableProps  } from "../../common/DownloadTable";
import { Variant } from "../Variant/variantModel";
import { createTableColumns, variantTableColumns } from "../../common/tableColumn";
import { ConfigurationWindow } from "../Configuration/configurationModel";


const dataToTableRows = (variantData : Variant.Data | null) : Variant.Phenotype[] => variantData?.phenos || []
declare let window: ConfigurationWindow;
const variant = window?.config?.userInterface?.variant;

const tableColumns : Column<Variant.Phenotype>[] = createTableColumns(variant?.table?.columns) || (variantTableColumns as Column<Variant.Phenotype>[])
const defaultSorted = variant?.table?.defaultSorted || [{
  id: 'pval',
  desc: true
}]

const tableProperties = {}

interface Props { variantData : Variant.Data }

const VariantTable = ({ variantData } : Props ) => {
  const tableData : Variant.Data = variantData;

  const filename = `${variantData.chrom}_${variantData.pos}_${variantData.ref}_${variantData.alt}_phenotype_associations.tsv`
  
  const prop : DownloadTableProps<Variant.Data, Variant.Phenotype> = {
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