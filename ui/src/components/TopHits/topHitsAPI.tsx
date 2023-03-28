import { get } from "../../common/commonUtilities";
import { TopHitsData } from "./topHitsModel";

export const getTopHits= (sink: (s: TopHitsData) => void, getURL = get) : void => {
  getURL(`/api/top_hits.json`, sink)
}