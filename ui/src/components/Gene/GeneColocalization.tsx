import React, { useContext, useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { getGeneColocalisations } from "./geneAPI";
import { GeneColocalizations as GeneColocalizationsModel } from "./geneModel";
import { GeneContext, GeneState } from "./GeneContext";
import { Column } from "react-table";
import { createTableColumns, geneColocTableColumns, phenoColocSubTable } from "../../common/commonTableColumn";
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import commonLoading from "../../common/CommonLoading";
import ReactTable from 'react-table-v6';
import 'react-table-v6/react-table.css';


declare let window: ConfigurationWindow;
const { config } = window;
const { config : { userInterface } = { userInterface : undefined } } = window;

const tableColumns : Column<GeneColocalizationsModel.Row>[] = createTableColumns(userInterface?.gene?.geneColocalizations?.tableColumns) || (geneColocTableColumns as Column<GeneColocalizationsModel.Row>[])
const tableProperties = {
  defaultPageSize : 10
}
const dataToTableRows = (d : GeneColocalizationsModel.Data| null) : GeneColocalizationsModel.Row[] => d || []

export const hasError = (errorMessage : string | null | undefined, content:  JSX.Element) :  JSX.Element => {
  if(errorMessage === null || errorMessage === undefined){
    return content
  } else {
    return <div>{errorMessage}</div>
  }
}

const colocalizationSubTable = ( row :  ReactTable ) : JSX.Element | any => {

  const value = row.original.disease_colocalizations;
  const pageSize = Math.min(10, Object.values(value).length);  

  return (
    <div style={{ padding: "20px" }}>
        <ReactTable  
          data={value}  
          columns={phenoColocSubTable} 
          defaultPageSize={pageSize}
        /> 
    </div>
  )
}


const GeneColocs = () => {
  const { gene } = useContext<Partial<GeneState>>(GeneContext);
  const [geneColocalizationData, setGeneColocalizationData] = useState<GeneColocalizationsModel.Data | null>(null);
  const [error, setError] = useState<string|null>(null);
  
  useEffect(() => { getGeneColocalisations(gene, setGeneColocalizationData, setError) },[gene]);

  const filename = `${gene}_disease_colocs.tsv`;

  const prop : DownloadTableProps<GeneColocalizationsModel.Data, GeneColocalizationsModel.Row> = {
    filename,
    tableData : geneColocalizationData,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted: [], 
    subComponent: colocalizationSubTable
  }

  const content = (
    <div> <CommonDownloadTable {...prop}/> </div>
  )
  return geneColocalizationData == null && error == null ? commonLoading : hasError(error, content)

}

export default GeneColocs
