import React, { useEffect, useState } from "react";
import { createTableColumns, topHitTableColumns } from "../../common/tableColumn";
import { mustacheDiv } from "../../common/Utilities";
import { TopHitsData, TopHitsRow } from "./topHitsModel";
import { getTopHits } from "./topHitsAPI";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { Column } from "react-table";
import DownloadTable, { DownloadTableProps } from "../../common/DownloadTable";

interface Props {}

const default_banner = `
<p>
This table is limited to the top hits, but the<br/>
button below will download all hits.<br/>
</p>

<p>[<a href="/download/top_hits.tsv">tsv</a>|<a href="/api/top_hits.json">json</a>]</p>
`

declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.topHits?.banner || default_banner;
const tableColumns : Column<TopHitsRow>[] = createTableColumns(config?.userInterface?.topHits?.tableColumns) || topHitTableColumns as Column<TopHitsRow>[];


const dataToTableRows = (topHitData : TopHitsData | null) : TopHitsRow[] => topHitData || []

const tableProperties = {}
const defaultSorted = [{
  id: 'pval',
  desc: false
}]

const TopHits = (props : Props) => {
  const [topHitData, setTopHitData] = useState<TopHitsData | null>(null);
  useEffect(() => {
    getTopHits(setTopHitData)
  },[]);

  const filename = 'tophits.tsv'
  const prop : DownloadTableProps<TopHitsData, TopHitsRow> = {
    filename,
    tableData : topHitData,
    dataToTableRows ,
    tableColumns ,
    tableProperties,
    defaultSorted
  }

  return <div className="row" style={{ width: '100%' }}>
      <div className="variant-info col-xs-12">
        {mustacheDiv(banner, { }) }
        <DownloadTable {...prop}/>
      </div>
  </div>
}

export default TopHits;