import React from "react";
import { Column, Row, SortingRule } from "react-table";
import DownloadTable, { DownloadTableProps  } from "../../common/DownloadTable";
import { VariantData , VariantRow } from "../Variant/variantModel";


const dataToTableRows = (variantData : VariantData | null) : VariantRow[] => variantData?.phenos || []
const tableColumns :
const prop = (phenotypeCode : string) : DownloadTableProps<VariantData, VariantRow> => {
  return {
    fetchTableData : fetchTableData ,
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