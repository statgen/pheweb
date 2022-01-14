import { get } from "../../common/Utilities";
import {
  GeneDrugData,
  GeneFunctionalVariantData,
  GeneLOFData, GenePhenotypeData,
  GenePhenotypeRow,
  GeneSummary,
  MyGeneInformation
} from "./geneModel";



export const getMyGeneInformation = (geneName : string,
                                     sink: (s: MyGeneInformation) => void,
                                     getURL = get) : void => {
  getURL(`https://mygene.info/v3/query?q=${geneName}&fields=symbol%2Cname%2Centrezgene%2Censembl.gene%2CMIM%2Csummary&species=human`, sink)
}

export const getGene = (geneName : string,
                                  sink: (s: GeneSummary) => void,
                                  getURL = get) : void => {
  getURL(`/api/gene/${geneName}`, sink)
}


export const getGenePhenotypes = (geneName : string,
                                  sink: (s: GenePhenotypeData) => void,
                                  getURL = get) : void => {
  getURL(`/api/gene_phenos/${geneName}`, sink)
}

export const getGeneDrugs =(geneName : string,
                      sink: (s: GeneDrugData) => void,
                      getURL = get) : void => {
  getURL(`/api/drugs/${geneName}`, sink)
}

export const getLOF =(geneName : string,
                        sink: (s: GeneLOFData) => void,
                        getURL = get) : void => {
  getURL(`/api/lof/${geneName}`, sink)
}

export const getGeneFunctionalVariants =(geneName : string,
                                         sink: (s: GeneFunctionalVariantData) => void,
                                         getURL = get) : void => {
  getURL(`/api/gene_functional_variants/${geneName}`, sink)
}
