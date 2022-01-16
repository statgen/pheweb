import { addLambda, Phenotype } from "../Index/indexModel";
import { get } from "../../common/Utilities";
import { PhenotypeVariantData } from "./phenotypeModel";

export const getManhattan= (phenotypeCode: string,
                            sink: (s: PhenotypeVariantData) => void, getURL = get) : void => {
  getURL(`/api/manhattan/pheno/${phenotypeCode}`, sink)
}

  export const getUKBBN = (phenotypeCode : string,
                         sink: (s: Phenotype[]) => void,
                         getURL = get) : void => {
  getURL(`/api/ukbb_n/${phenotypeCode}`, sink)
}

export const getPhenotype = (phenotypeCode : string,
                         sink: (s: Phenotype[]) => void,
                         getURL = get) : void => {
  getURL(`/api/pheno/${phenotypeCode}`, sink)
}

export const getGroup = (phenotypeCode : string,
                         locusId : string,
                         sink: (s: Phenotype[]) => void,
                         getURL = get) : void => {
  getURL(`/api/autoreport_variants/${phenotypeCode}/${locusId}`, sink)
}

export const getCredibleSets = (phenotypeCode : string,
                                locusId : string,
                                sink: (s: Phenotype[]) => void,
                                getURL = get) : void => {
  getURL(`/api/autoreport/${phenotypeCode}/${locusId}`, sink)
}

