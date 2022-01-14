import React, { useEffect, useState } from "react";
import { Column, Row, SortingRule } from "react-table";
import DownloadTable, { DownloadTableProps  } from "../../common/DownloadTable";
import { VariantData , VariantRow } from "../Variant/variantModel";
import { createTableColumns, phenotypeTableColumns, variantTableColumns } from "../../common/tableColumn";
import { ConfigurationWindow } from "../Configuration/configurationModel";


const dataToTableRows = (variantData : VariantData | null) : VariantRow[] => variantData?.phenos || []
declare let window: ConfigurationWindow;
const { config : { userInterface } = { userInterface : undefined } } = window;

const tableColumns : Column<VariantRow>[] = createTableColumns(userInterface?.variant?.variantTable) || (variantTableColumns as Column<VariantRow>[])
const tableProperties = {}
const defaultSorted = [{
  id: 'pval',
  desc: false
}]

interface Props { variantData : VariantData }

const VariantTable = ({ variantData } : Props ) => {
  const tableData : VariantData = variantData;

  const prop : DownloadTableProps<VariantData, VariantRow> = {
      tableData,
      dataToTableRows ,
      tableColumns ,
      tableProperties,
      defaultSorted
  }
  return <DownloadTable {...prop} />
}
export default VariantTable