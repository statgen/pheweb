import { get } from "../../common/Utilities";
import { FunctionalVariants, GeneDrugs, GenePhenotypes, LossOfFunction, MyGene } from "./geneModel";
import { resolveURL } from "../Configuration/configurationModel";

export const getGeneDrugs =(geneName : string,
                      sink: (s: GeneDrugs.Data) => void,
                      getURL = get) : void => {
  getURL(resolveURL(`/api/drugs/${geneName}`), sink)
}

export const getGeneFunctionalVariants =(geneName : string,
                                         sink: (s: FunctionalVariants.Data) => void,
                                         getURL = get) : void => {
  getURL(resolveURL(`/api/gene_functional_variants/${geneName}`), sink)
}


export const getLossOfFunction =(gene : string,
                      sink: (s: LossOfFunction.Data) => void,
                      getURL = get) : void => {
  getURL(resolveURL(`/api/lof/${gene}`), sink)
}

export const getGenePhenotypes = (gene : string,
                                  sink: (s: GenePhenotypes.Data) => void,
                                  getURL = get) : void => {
  const url = resolveURL(`/api/gene_phenos/${gene}`)
  getURL(url, sink)
}

export const getMyGene = (gene : string,
                          sink: (s: MyGene.Data) => void,
                          getURL = get) : void => {
  getURL(`https://mygene.info/v3/query?q=${gene}&fields=symbol%2Cname%2Centrezgene%2Censembl.gene%2CMIM%2Csummary&species=human`, sink)
}

