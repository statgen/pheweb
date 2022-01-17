import { EnsemblData, NCBIData, PubMedData, VariantData } from "./variantModel";
import { get } from "../../common/Utilities";
import { Variant, variantToPheweb } from "../../common/Model";

export const getVariant= (variant: Variant,
                          sink: (s: VariantData) => void,getURL = get) : void => {
  getURL(`/api/variant/${variantToPheweb(variant)}`, sink)
}

export  const getEnsembl = (rsid : String,
                            sink: (s: EnsemblData) => void,getURL = get) : void => {
  getURL(`https://grch37.rest.ensembl.org/variation/human/${rsid}?content-type=application/json`, sink)
}

export const getNCBI = (variant: Variant,
                        sink: (s: NCBIData) => void,getURL = get) : void => {
  getURL(`https://www.ncbi.nlm.nih.gov/clinvar?term=${variant.chromosome}[Chromosome]%20AND%20${variant.position}[Base%20Position%20for%20Assembly%20GRCh38]`, sink)
}

export  const getPubMed = (rsid : string,
                            sink: (s: PubMedData) => void,getURL = get) : void => {
  getURL(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=1&retmode=xml&term=${rsid}`, sink)
}
