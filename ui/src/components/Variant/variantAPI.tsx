import { Ensembl, NCBI, PubMed, Variant as ModelVariant } from "./variantModel";
import { get, warn, Handler } from "../../common/Utilities";
import { Variant, variantToPheweb } from "../../common/Model";
import { resolveURL } from "../Configuration/configurationModel";

export const getVariant= (variant: Variant,
                          sink: (s: ModelVariant.Data) => void,
                          setError: (s: string | null) => void,
                          getURL = get) : void => {
  const handler : Handler = (url : string) => (e : Error) => setError(`Loading variant ${variantToPheweb(variant)} ${e.message}`);
  getURL(resolveURL(`/api/variant/${variantToPheweb(variant)}`), sink,handler)
}

export  const getEnsembl = (rsid : String,
                            sink: (s: Ensembl.Data) => void,getURL = get) : void => {
  getURL(`https://grch37.rest.ensembl.org/variation/human/${rsid}?content-type=application/json`, sink)
}


export const getNCBI = (variant: Variant,
                        sink: (s: NCBI.Data) => void,getURL = get) : void => {
  getURL(`https://www.ncbi.nlm.nih.gov/clinvar?term=${variant.chromosome}[Chromosome]%20AND%20${variant.position}[Base%20Position%20for%20Assembly%20GRCh38]`, sink)
}

export  const getPubMed = (rsid : string,
                            sink: (s: PubMed.Data) => void,getURL = get) : void => {
  getURL(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=1&retmode=xml&term=${rsid}`, sink)
}
