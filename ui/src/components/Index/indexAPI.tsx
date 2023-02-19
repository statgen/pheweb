import { addLambda, Phenotype } from "./indexModel";
import { get } from "../../common/Utilities";
import { resolveURL } from "../Configuration/configurationModel";

export const getPhenotypes = (sink: (s: Phenotype[]) => void,
                              getURL = get) : void => {
  getURL(resolveURL('/api/phenos'), (p : Phenotype[]) => sink(p.map(addLambda)))
}
