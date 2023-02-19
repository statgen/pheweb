import { LOF } from "./lofModel";
import { get } from "../../common/Utilities";
import { resolveURL } from "../Configuration/configurationModel";

export const getLOF= (sink: (s: LOF.Data) => void,getURL = get) : void => {
  getURL(resolveURL(`/api/lof`), sink)
}
