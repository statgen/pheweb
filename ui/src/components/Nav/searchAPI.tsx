import { get } from '../../common/commonUtilities'
import { resolveURL } from "../Configuration/configurationModel";
import { SearchResult } from "./searchModel";

export const getAutocomplete= (query: string[],
                               callBack: (s: SearchResult[]) => void,
                               getURL = get) : void => {
  getURL(resolveURL('/api/autocomplete',{ query}), callBack)
}
