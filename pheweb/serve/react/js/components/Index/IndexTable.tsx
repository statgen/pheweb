import React, { useState } from "react";
import ReactTable from "react-table-v6";
import { createCSVLinkHeaders, createTableColumns, phenotypeListTableColumns } from "../../common/tableColumn";
import { ConfigurationWindow } from "../Configuration/ConfigurationModel";
import loading from "../../common/Loading";
import { Phenotype } from "./indexModel";
import { CSVLink } from "react-csv";

interface Props { }

declare let window: ConfigurationWindow;


export const Table = (props: Props) => {
  const { config } = window;

  const [phenotypes, setPhenotypes] = useState<Phenotype[] | null>(null);
  const [dataToDownload, setDataToDownload] = useState<Phenotype[] | null>(null);
  const [reactTableRef, setReactTableRef] = useState<ReactTable | null>(null);
  const [link, setLink] = useState<HTMLAnchorElement | null>(null);


  const getPhenotypes = () => {
    fetch("/api/phenos")
      .then(response => {
        if (!response.ok) {
          throw response;
        } else {
          return response.json();
        }
      })
      .then((response: Phenotype[]) => {
        response = response.map((phenotype: Phenotype) => {
          return { ...phenotype, lambda: phenotype.gc_lambda["0.5"] };
        });
        setPhenotypes(response);
      })
      .catch(error => {
        alert(`${error.statusText || error}`);
      });
  };

  const tableColumns = createTableColumns(config?.userInterface?.index?.tableColumns) || phenotypeListTableColumns;
  const download = () => {
    if (reactTableRef != null) {
      setDataToDownload(reactTableRef.getResolvedState().sortedData);
      link && link.click();
    }
  };

  const body = <div style={{ width: "100%", padding: "0" }}>

    <ReactTable ref={setReactTableRef}
                data={phenotypes}
                filterable
                defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().includes(filter.value.toLowerCase())}
                columns={tableColumns}
                defaultSorted={[{ id: "num_gw_significant", desc: true }]}
                defaultPageSize={20}
                className="-striped -highlight"
    />

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
  return phenotypes ? loading : body;
};

export default Table;