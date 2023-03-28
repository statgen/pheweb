import { mustacheDiv } from "../../common/Utilities";
import React, { useContext, useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { getGenePqtlColocalisations } from "./geneAPI";
import loading from "../../common/Loading";
import { PqtlColocalizations as PqtlColocalizationsModel } from "./geneModel";
import { GeneContext, GeneState } from "./GeneContext";
import { Column } from "react-table";
import { createTableColumns, genePqtlTableColumns, colocSubTable } from "../../common/tableColumn";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";

import ReactTable from 'react-table-v6';
import 'react-table-v6/react-table.css';

const default_banner: string = `
<h3>pQTL and Disease Colocalizations</h3>
`

declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.pqtlColocalizations?.banner || default_banner;
const { config : { userInterface } = { userInterface : undefined } } = window;

const tableColumns : Column<PqtlColocalizationsModel.Row>[] = createTableColumns(userInterface?.gene?.pqtlColocalizations?.tableColumns) || (genePqtlTableColumns as Column<PqtlColocalizationsModel.Row>[])
const tableProperties = {
  defaultPageSize : 5
}
const dataToTableRows = (d : PqtlColocalizationsModel.Data| null) : PqtlColocalizationsModel.Row[] => d || []
const defaultSorted = [{
  id: 'p',
  desc: false
}]

const colocalizationSubTable = ( prop ) => {
  const value = prop.original.disease_colocalizations[0];
  const pageSize = Math.min(5, Object.keys(value).length);
  return (
      <div style={{ padding: "20px" }}>
        <h5>Disease Colocalizations</h5>
        {
          Object.keys(value).length > 0 ?
            <ReactTable  
              data={value}  
              columns={colocSubTable} 
              defaultPageSize={pageSize}
            />  : 
            null
        }
    </div>
  )
}

const GenePqtls = () => {
  const { gene } = useContext<Partial<GeneState>>(GeneContext);
  const [genePqtlColocalizationData, setGenePqtlColocalizationData] = useState<PqtlColocalizationsModel.Data | null>(null);
  useEffect(() => { getGenePqtlColocalisations(gene, setGenePqtlColocalizationData) },[gene]);

  const filename = `${gene}_pqtl_coloc.tsv`;

  const prop : DownloadTableProps<PqtlColocalizationsModel.Data, PqtlColocalizationsModel.Row> = {
    filename,
    tableData : genePqtlColocalizationData,
    dataToTableRows,
    tableColumns ,
    tableProperties,
    defaultSorted, 
    subComponent: colocalizationSubTable
  }

  const context = { gene }
  return genePqtlColocalizationData == null ? loading: <div>
    {mustacheDiv(banner, context)}
    <DownloadTable {...prop}/>
  </div>
}

export default GenePqtls