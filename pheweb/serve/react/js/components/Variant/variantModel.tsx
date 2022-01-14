import { TableColumnConfiguration } from "../../common/tableColumn";

export interface VariantRow {
  af_alt: number,
  af_alt_cases: number,
  af_alt_controls: number,
  beta: number,
  category: string,
  category_index: number,
  gc_lambda: { [ key : number] : number }
  mlogp: number,
  num_cases: number,
  num_cases_prev: string,
  num_controls: number,
  num_gw_significant: number,
  num_gw_significant_prev: number,
  phenocode: string,
  phenostring: string,
  pval: string,
  sebeta: string,
}

export interface VariantData {
  alt: String,
  chrom: String,
  nearest_genes: String,
  pos: number,
  ref: string,
  rsids: string,
  phenos : VariantRow[]
}

export interface VariantConfiguration {
  variantTable? : TableColumnConfiguration<VariantRow>
  banner?: string;
}
