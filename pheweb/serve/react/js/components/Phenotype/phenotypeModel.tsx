import { TableColumnConfiguration } from "../../common/tableColumn";

export interface VariantRow {
  peak? : number
  annotation: { most_severe: string, INFO?: string }
  info?: string
  most_severe? : string
  maf? : number
  af_alt? : number
  maf_cases? : number
  maf_controls? : number
  pval: number,
  af_alt_cases: number
  af_alt_controls : number
  phenocode : string
  fin_enrichment : number
  gnomad:  { [key: string]: string } & { AF_fin : number}
}

export interface VariantData {
  unbinned_variants : VariantRow[]
}

export interface PhenotypeConfiguration {
  banner?: string;
  variantTable? : { tableColumns?: TableColumnConfiguration<VariantRow> };
}
