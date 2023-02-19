import { Phenotype } from "../Index/indexModel";
import { get } from "../../common/Utilities";
import { PhenotypeVariantData } from "./phenotypeModel";
import { resolveURL } from "../Configuration/configurationModel";

export const getManhattan= (phenotypeCode: string,
                            sink: (s: PhenotypeVariantData) => void,
                            getURL = get) : void => {
  getURL(resolveURL(`/api/manhattan/pheno/${phenotypeCode}`), sink)
}

  export const getUKBBN = (phenotypeCode : string,
                         sink: (s: Phenotype[]) => void,
                         getURL = get) : void => {
  getURL(resolveURL(`/api/ukbb_n/${phenotypeCode}`), sink)
}

export const getPhenotype = (phenotypeCode : string,
                         sink: (s: Phenotype[]) => void,
                         getURL = get) : void => {
  getURL(resolveURL(`/api/pheno/${phenotypeCode}`), sink)
}

export const getGroup = (phenotypeCode : string,
                         locusId : string,
                         sink: (s: Phenotype[]) => void,
                         getURL = get) : void => {
  getURL(resolveURL(`/api/autoreport_variants/${phenotypeCode}/${locusId}`), sink)
}

export const getCredibleSets = (phenotypeCode : string,
                                locusId : string,
                                sink: (s: Phenotype[]) => void,
                                getURL = get) : void => {
  getURL(resolveURL(`/api/autoreport/${phenotypeCode}/${locusId}`), sink)
}

