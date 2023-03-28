import { Phenotype } from "../Index/indexModel";
import { compose, get, Handler } from "../../common/commonUtilities";
import { CredibleSet, LocusGroupEntry, PhenotypeVariantData, QQ } from "./phenotypeModel";
import { resolveURL } from "../Configuration/configurationModel";
import { pValueSentinel } from "../../common/commonTableColumn";

const reshapeManhattan = (phenotypeCode: string) =>(data : PhenotypeVariantData) : PhenotypeVariantData => {
  if(data === null || data === undefined) return data;
  data.unbinned_variants.filter(variant => !!variant.annotation).forEach(variant => {
    variant.most_severe = variant.annotation.most_severe ? variant.annotation.most_severe.replace(/_/g, ' ').replace(' variant', '') : ''
    variant.info = variant.annotation.INFO
  })
  data.unbinned_variants.forEach(variant => { if (variant.pval === 0) variant.pval = pValueSentinel })
  //TODO server side
  data.unbinned_variants.forEach(variant => {
    // TODO naming af maf quickly
    if (variant.af_alt !== undefined && variant.maf === undefined) {
      variant.maf = variant.af_alt
      variant.maf_cases = variant.af_alt_cases
      variant.maf_controls = variant.af_alt_controls
      delete variant.af_alt
      delete variant.af_alt_cases
      delete variant.af_alt_controls
    }
    variant.phenocode = phenotypeCode
    if (!variant.gnomad) {
      variant.fin_enrichment = -1
    } else if (+variant.gnomad.AF_fin === 0) {
      variant.fin_enrichment = 0
    } else if (+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu'] === 0) {
      variant.fin_enrichment = 1e6
    } else {
      variant.fin_enrichment = +variant.gnomad['AC_fin'] / +variant.gnomad['AN_fin'] /
        ((+variant.gnomad['AC_nfe_nwe'] + +variant.gnomad['AC_nfe_onf'] + +variant.gnomad['AC_nfe_seu']) / (+variant.gnomad['AN_nfe_nwe'] + +variant.gnomad['AN_nfe_onf'] + +variant.gnomad['AN_nfe_seu']))
    }
  });
  return data;
}

export const getManhattan= (phenotypeCode: string,
                            sink: (s: PhenotypeVariantData) => void,
                            getURL = get) : void => {
  getURL(resolveURL(`/api/manhattan/pheno/${phenotypeCode}`), compose<PhenotypeVariantData,PhenotypeVariantData,void>(reshapeManhattan(phenotypeCode),sink))
}

  export const getUKBBN = (phenotypeCode : string,
                         sink: (s: Phenotype[]) => void,
                         getURL = get) : void => {
  getURL(resolveURL(`/api/ukbb_n/${phenotypeCode}`), sink)
}

const addRisteys = (phenotype : Phenotype) => {
  phenotype.risteys = phenotype.phenocode.replace('_EXMORE', '');
  return phenotype;
}

export const getPhenotype = (phenotypeCode : string,
                             sink: (s: Phenotype) => void,
                             setError: (s: string | null) => void,
                             getURL = get) : void => {
  const handler : Handler = (url : string) => (e : Error) => setError(`Loading phenotype '${phenotypeCode}' ${e.message}`);
  getURL(resolveURL(`/api/pheno/${phenotypeCode}`), compose<Phenotype, Phenotype, void>(addRisteys,sink), handler)
}

export const getGroup = (phenotypeCode : string,
                         locusId : string,
                         sink: (s: LocusGroupEntry) => void,
                         getURL = get) : void => {
  getURL(resolveURL(`/api/autoreport_variants/${phenotypeCode}/${locusId}`), sink)
}

export const getCredibleSets = (phenotypeCode : string,
                                sink: (s: CredibleSet[]) => void,
                                getURL = get) : void => {
  getURL(resolveURL(`/api/autoreport/${phenotypeCode}`), sink)
}

export const getQQ = (phenotypeCode : string,
                      sink: (s: QQ) => void,
                      getURL = get) : void => {
  getURL(resolveURL(`/api/qq/pheno/${phenotypeCode}`), sink)
}
