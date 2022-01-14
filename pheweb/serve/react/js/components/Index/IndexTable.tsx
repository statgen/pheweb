import React, { useEffect, useState } from "react";
import ReactTable from "react-table-v6";
import { createCSVLinkHeaders, createTableColumns, phenotypeListTableColumns } from "../../common/tableColumn";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import loading from "../../common/Loading";
import { Phenotype } from "./indexModel";
import { CSVLink } from "react-csv";
import { getPhenotypes } from "./indexAPI";
import { mustacheDiv, mustacheSpan } from "../../common/Utilities";

interface Props { }

declare let window: ConfigurationWindow;

/* Abstraction is broken here see:
 * https://stackoverflow.com/questions/53504924/reactjs-download-csv-file-on-button-click
 */
interface Link extends HTMLAnchorElement { link : HTMLAnchorElement }

const defaultFilterMethod = (filter : { id : string , value : string }, row : { [key: string]: string } ) => row[filter.id].toLowerCase().includes(filter.value.toLowerCase())
const default_banner: string = ``

const { config } = window;
const tableColumns = createTableColumns(config?.userInterface?.index?.tableColumns) || phenotypeListTableColumns;

export const Table = (props: Props) => {


  const [phenotypes, setPhenotypes] = useState<Phenotype[] | null>(null);
  const [dataToDownload, setDataToDownload] = useState<Phenotype[] | null>(null);
  const [reactTableRef, setReactTableRef] = useState<ReactTable | null>(null);
  const [link, setLink] = useState<Link | null>(null);

  const banner: string = config?.userInterface?.index?.banner || default_banner;


  useEffect(() => { getPhenotypes(setPhenotypes); },[]);

  const download = () => {
    if (reactTableRef != null) {
      setDataToDownload(reactTableRef.getResolvedState().sortedData);
      link && link.link.click();
    }
  };

  const body = <div style={{ width: "100%", padding: "0" }}>
      {mustacheDiv(banner, {})}

    <ReactTable ref={setReactTableRef}
                data={phenotypes}
                filterable
                defaultFilterMethod={defaultFilterMethod}
                columns={tableColumns}
                defaultSorted={[{ id: "num_gw_significant", desc: true }]}
                defaultPageSize={20}
                className="-striped -highlight"
    />
   <p>

   </p>
    <div className="row">
      <div className="col-xs-12">
        <div className="btn btn-primary"
             onClick={download}>Download table
        </div>
      </div>
    </div>

    <CSVLink
      headers={createCSVLinkHeaders(tableColumns)}
      data={dataToDownload || []}
      separator={"\t"}
      enclosingCharacter={""}
      filename="endpoints.tsv"
      className="hidden"
      ref={(r) => setLink(r)}
      target="_blank" />

  </div>;
  const component = phenotypes == null? loading : body;
  return component;
};

export default Table;