import { scientificFormatter } from "../../common/Formatter";
import { warn } from "../../common/Utilities";

export const finEnrichmentLabel = (gnomad : { [key : string ] : (string | number)}) : string => {

  let finEnrichment: string

  if (!gnomad) {
    finEnrichment = 'No data in gnomAD'
  } else if (gnomad &&
    'AF_fin' in gnomad &&
    +gnomad['AF_fin'] === 0) {
    finEnrichment = 'No FIN in gnomAD'
  } else if (gnomad &&
    'AC_nfe_nwe' in gnomad &&
    'AC_nfe_nwe' in gnomad &&
    'AC_nfe_onf' in gnomad &&
    'AC_nfe_seu' in gnomad &&
    +gnomad['AC_nfe_nwe'] + +gnomad['AC_nfe_onf'] + +gnomad['AC_nfe_seu'] === 0) {
    finEnrichment = 'No NFEE in gnomAD'
  } else if ('AC_fin' in gnomad &&
    'AN_fin' in gnomad &&
    'AC_nfe_nwe' in gnomad &&
    'AC_nfe_onf' in gnomad &&
    'AC_nfe_seu' in gnomad &&
    'AN_nfe_nwe' in gnomad &&
    'AN_nfe_onf' in gnomad &&
    'AN_nfe_seu' in gnomad) {
    const fin_enrichment_value: number =
      +gnomad['AC_fin'] / +gnomad['AN_fin'] /
      ((+gnomad['AC_nfe_nwe'] + +gnomad['AC_nfe_onf'] + +gnomad['AC_nfe_seu']) /
        (+gnomad['AN_nfe_nwe'] + +gnomad['AN_nfe_onf'] + +gnomad['AN_nfe_seu']))
    finEnrichment = scientificFormatter(fin_enrichment_value)
  } else {
    finEnrichment = 'Not available'
    warn('fin enrichment Not available', gnomad)
  }
  return finEnrichment;
}

/*
export const finEnrichment = (gnomad : { [key : string ] : (string | number)}) => {
  let value = undefined
  if(gnomad){
    if ('AC_fin' in gnomad &&
       'AN_fin' in gnomad &&
       'AC_nfe_nwe' in gnomad &&
       'AC_nfe_onf' in gnomad &&
       'AC_nfe_seu' in gnomad &&
       'AN_nfe_nwe' in gnomad &&
       'AN_nfe_onf' in gnomad &&
       'AN_nfe_seu' in gnomad &&
       !isNaN(+gnomad['AC_fin']) &&
       !isNaN(+gnomad['AN_fin']) &&
       !isNaN(+gnomad['AC_nfe_nwe']) &&
       !isNaN(+gnomad['AC_nfe_onf']) &&
       !isNaN(+gnomad['AC_nfe_seu']) &&
       !isNaN(+gnomad['AN_nfe_nwe']) &&
       !isNaN(+gnomad['AN_nfe_onf']) &&
       !isNaN(+gnomad['AN_nfe_seu'])) {
      value =
        +gnomad['AC_fin'] / +gnomad['AN_fin'] /
        ((+gnomad['AC_nfe_nwe'] + +gnomad['AC_nfe_onf'] + +gnomad['AC_nfe_seu']) /
          (+gnomad['AN_nfe_nwe'] + +gnomad['AN_nfe_onf'] + +gnomad['AN_nfe_seu']))
    }
  }
  return value
}

*/