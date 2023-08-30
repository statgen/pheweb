import { get, Handler } from "../../common/commonUtilities";
import { FunctionalVariants, GeneDrugs, GenePhenotypes, LossOfFunction, MyGene, PqtlColocalizations } from "./geneModel";
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
                                  setError: (s: string | null) => void,
                                  getURL = get) : void => {
  const handler : Handler = (url : string) => (e : Error) => setError(`Loading gene '${gene}' ${e.message}`);
  const url = resolveURL(`/api/gene_phenos/${gene}`)
  getURL(url, sink, handler)
}

export const getMyGene = (gene : string,
                          sink: (s: MyGene.Data) => void,
                          getURL = get) : void => {
  getURL(`https://mygene.info/v3/query?q=${gene}&fields=symbol%2Cname%2Centrezgene%2Censembl.gene%2CMIM%2Csummary&species=human`, sink)
}

export const getGenePqtlColocalisations = (gene : string,
  sink: (s: PqtlColocalizations.Data) => void,
  setError: (s: string | null) => void,
  getURL = get) : void => {
    const handler : Handler = (url : string) => (e : Error) => setError(`pQTL data ${e.message}`);
    const url = resolveURL(`/api/gene_pqtl_colocalization/${gene}`)
    getURL(url, sink, handler)
}
