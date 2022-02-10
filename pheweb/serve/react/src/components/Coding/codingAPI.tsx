import { resolveURL } from "../Configuration/configurationModel";
import { Coding } from "./codingModel";
import { get } from "../../common/Utilities";

export const getCoding = (sink: (s: Coding.Data) => void,getURL = get) : void => {
  getURL(resolveURL('/api/coding_data'), sink)
}
