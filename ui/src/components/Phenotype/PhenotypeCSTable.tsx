import React, { useContext, useState } from "react";
import ReactTable  from "react-table-v6";
import { csTableCols, csInsideTableCols, createTableColumns } from "../../common/commonTableColumn";
import { PhenotypeContext, PhenotypeState } from "./PhenotypeContext";
import { CredibleSet, LocusGroupEntry, PhenotypeVariantRow } from "./phenotypeModel";
import { getGroup } from "./phenotypeAPI";
import { Column } from "react-table";
import CommonDownloadTable, { DownloadTableProps } from "../../common/CommonDownloadTable";
import { ConfigurationWindow } from "../Configuration/configurationModel";

type LocusGroups =  { [locus_id: string]: LocusGroupEntry };
declare let window: ConfigurationWindow;

const configuration = window?.config?.userInterface?.phenotype?.credibleSet;

const defaultSorted = configuration?.table?.defaultSorted || [{ id: 'pval', desc: false }];

const PhenotypeCSTable = () => {
  const {  credibleSets , phenotypeCode } = useContext<Partial<PhenotypeState>>(PhenotypeContext);
  const tableData : CredibleSet[] = credibleSets || [];
  const filename : string = `${phenotypeCode}.tsv`
  const dataToTableRows : (d : CredibleSet[]) => CredibleSet[] = (x => x)
  const tableColumns :  Column<CredibleSet>[] = createTableColumns<CredibleSet>(configuration?.table?.columns) || csTableCols as Column<CredibleSet>[];
  const [locusGroups, setLocusGroups] = useState<LocusGroups>({});
  const tableProperties = {}

  const getLocusGroupData = (locus_id : string) => {
    if(locusGroups.hasOwnProperty(locus_id)) {
      return locusGroups[locus_id];
    } else {
      getGroup(phenotypeCode, locus_id, updateLocusGroup(locus_id));
      return null;
    }
  }
  const updateLocusGroup = (locus_id : string) => (entry : LocusGroupEntry)=> {
    const updated = {
      ...locusGroups,
      [locus_id]: entry
    }
    setLocusGroups(updated);
  }

  const subComponent = row => {
    const locus_id = row['original']['locus_id'];
    const data = getLocusGroupData(locus_id);
    return <ReactTable data={data || [] }
                       loading={data == null}
                       columns={csInsideTableCols}
                       defaultSorted={defaultSorted}
                       defaultPageSize={10}
                       showPagination={true}
                       showPageSizeOptions={true}
    />
  }

  const props : DownloadTableProps<CredibleSet[], CredibleSet>  = {
    filename,
    tableData,
    dataToTableRows,
    tableColumns,
    tableProperties,
    subComponent,
    defaultSorted  }

  return <div>
    <CommonDownloadTable {...props} />
  </div>

}

export default PhenotypeCSTable
