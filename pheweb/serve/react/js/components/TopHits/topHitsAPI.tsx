import { Variant, variantToPheweb } from "../../common/Model";
import { VariantData } from "../Variant/variantModel";
import { get } from "../../common/Utilities";
import { TopHitsData } from "./topHitsModel";

export const getTopHits= (sink: (s: TopHitsData) => void, getURL = get) : void => {
  getURL(`/api/top_hits.json`, sink)
}