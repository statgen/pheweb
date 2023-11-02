import React, { useContext } from "react";
import { GeneContext, GeneState } from "./GeneContext";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { PqtlColocalizations as PqtlColocalizationsModel } from "./geneModel";
import { Column } from "react-table";
import { createTableColumns, genePqtlTableColumns, colocSubTable } from "../../common/commonTableColumn";
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import commonLoading from "../../common/CommonLoading";
import ReactTable from 'react-table-v6';
import 'react-table-v6/react-table.css';

declare let window: ConfigurationWindow;
const { config : { userInterface } = { userInterface : undefined } } = window;

const tableColumns : Column<PqtlColocalizationsModel.Row>[] = createTableColumns(userInterface?.gene?.pqtlColocalizations?.tableColumns) || (genePqtlTableColumns as Column<PqtlColocalizationsModel.Row>[])
const dataToTableRows = (d : PqtlColocalizationsModel.Data| null) : PqtlColocalizationsModel.Row[] => d || []

const tableProperties = {
  defaultPageSize : 5
}

const defaultSorted = [{
  id: 'p',
  desc: false
}]

export const hasError = (errorMessage : string | null | undefined, content:  JSX.Element) :  JSX.Element => {
  if(errorMessage === null || errorMessage === undefined){
    return content
  } else {
    return <div>{errorMessage}</div>
  }
}

const colocalizationSubTable = ( row :  ReactTable ) : JSX.Element | any => {

  const value = row.original.disease_colocalizations[0];
  const pageSize = Math.min(10, Object.keys(value).length);

  var chrPos = row.original.v.split(':', 2);  
  var chrom = chrPos[0];
  var pos: number = +chrPos[1];
  var region = `${chrom}:${pos - 200000}-${pos + 200000}`;

  // add region to the phenotype description for creating a link
  for (var i=0; i < Object.keys(value).length; i++){
    value[i]['phenotype1_region'] = {
      'pheno': value[i].phenotype1,
      'region': region
    }
  }
  
  return (
      Object.keys(value).length > 0 ?
        <div style={{ padding: "20px" }}>
          <h5>Disease Colocalizations</h5>
          <ReactTable  
            data={value}  
            columns={colocSubTable} 
            defaultPageSize={pageSize}
          /> 
      </div> : 
      <div style={{ padding: "20px" }}> No disease colocalizations found. </div>
  )
}

const GenePqtls = ( props ) => {

  const { gene } = useContext<Partial<GeneState>>(GeneContext);
  const filename=`${gene}_pqtl.tsv`

  const prop : DownloadTableProps<PqtlColocalizationsModel.Data, PqtlColocalizationsModel.Row> = {
    filename,
    tableData : props.genePqtlColocalizationData,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted, 
    subComponent: colocalizationSubTable
  }

  const content = (
    <div> <CommonDownloadTable {...prop}/> </div>
  )
  return props.genePqtlColocalizationData == null && props.error == null ? commonLoading : hasError(props.error, content)

}

export default GenePqtls
