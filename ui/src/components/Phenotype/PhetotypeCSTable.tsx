import React, { useContext, useEffect, useState } from "react";
import ReactTable  from "react-table-v6";
import { CSVLink } from "react-csv";
import { csTableCols ,csInsideTableCols } from '../../common/commonTableColumn'
import { PhenotypeContext, PhenotypeState } from "./PhenotypeContext";
import { LocusGroupEntry } from "./phenotypeModel";
import { getGroup } from "./phenotypeAPI";

interface Link extends HTMLAnchorElement { link : HTMLAnchorElement }

const defaultSorted = [{ id: 'pval', desc: false }];
type LocusGroups =  { [locus_id: string]: LocusGroupEntry };

const PhenotypeCSTable = () => {
  const [reactTableRef, setReactTableRef] = useState(null);
  const [link, setLink] = useState<Link | null>(null);
  const [download, setDownload] = useState(null);

  const [locusGroups, setLocusGroups] = useState<LocusGroups>({});
  const { credibleSets , phenotypeCode } = useContext<Partial<PhenotypeState>>(PhenotypeContext);

  useEffect(() => { download && link && link.link.click() },[download,link]);

  const updateLocusGroup = (locus_id : string) => (entry : LocusGroupEntry)=> {
    const updated = {
      ...locusGroups,
      [locus_id]: entry
    }
    setLocusGroups(updated);
  }

  const getLocusGroupData = (locus_id : string) => {
    if(locusGroups.hasOwnProperty(locus_id)) {
      return locusGroups[locus_id];
    } else {
      getGroup(phenotypeCode, locus_id, updateLocusGroup(locus_id));
      return null;
    }
  }
  const downloadHandler = () => {
    if (reactTableRef != null) {
      const data = reactTableRef.getResolvedState().sortedData.map(datum => Object.keys(datum).reduce((acc, cur) => {
        if (!cur.startsWith('_')) acc[cur] = datum[cur]
        return acc
      }, {}));
      setDownload(data);
    }
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

  const reactTable = <ReactTable
    ref={setReactTableRef}
    data={credibleSets}
    filterable
    defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().includes(filter.value.toLowerCase())}
    columns={csTableCols}
    defaultSorted={defaultSorted}
    defaultPageSize={20}
    className="-striped -highlight"
    SubComponent={subComponent}
    />

  return <div>
    {reactTable}

    <p>
    </p>
    <div className="row">
      <div className="col-xs-12">
        <div className="btn btn-primary" onClick={downloadHandler}>Download table</div>
      </div>
    </div>
    <CSVLink
      data={download == null ? [] : download }
      separator={'\t'}
      enclosingCharacter={''}
      filename={`${phenotypeCode}_autorep.tsv`}
      className="hidden"
      ref={(r) => setLink(r)}
      target="_blank"/>
  </div>
}

export default PhenotypeCSTable