import { TableColumnConfiguration } from "../../common/commonTableColumn";
import { SortingRule } from "react-table";
import { VisConfiguration } from "../Configuration/configurationModel";

export interface PhenotypeParams {
  pheno : string
}

export type LocusGroupEntry = { [ key : string ] : string }

export interface CredibleSet {
  all_traits_relaxed: string
  all_traits_strict: string
  chrom: string
  pos: number
  credible_set_variants: string
  cs_log_bayes_factor: number
  cs_size: number
  functional_variants_strict: string
  good_cs: boolean
  lead_af_alt: number
  lead_beta: number
  lead_sebeta: number
  lead_enrichment: any
  lead_mlogp: number
  lead_most_severe_gene: string
  locus_id: string
  phenocode: string
  pval: number
  ukbb_beta: string
  ukbb_pval: string
}

export interface QQPlotParam {
  maf_range:  number[]
  qq: number[][]
  count: number
  // state
  color?: string
}

export interface QQ {
  overall: Overall
  by_maf?: QQPlotParam[]
}

export interface Overall {
  qq: number[][]
  count: number
  gc_lambda: GcLambda
}

export interface GcLambda {
  "0.5": number
  "0.1": number
  "0.01": number
  "0.001": number
}

export interface UnbinnedVariant {
  af_alt? : number
  af_alt_cases: number
  af_alt_controls: number
  alt: string
  beta: number
  chrom: string
  fin_enrichment? : number
  info?: string
  maf? : number
  maf_cases? : number
  maf_controls? : number
  mlogp: number
  pScaled? : number
  most_severe? : string
  n_het_cases: number
  n_het_controls: number
  n_hom_cases: number
  n_hom_controls: number
  n_hom_ref_cases: number
  n_hom_ref_controls: number
  nearest_genes: string
  phenocode : string
  pos: number
  pval: number
  ref: string
  rsids: string
  sebeta: number
  annotation?: { [ key : string ] : string }
  gnomad?: { [ key : string ] : string }
  peak?: boolean
  // state
  isDisabled?: boolean
}


export type PhenotypeVariantRow = UnbinnedVariant;

export interface VariantBin {
  chrom: string
  neglog10_pval_extents: number[][]
  neglog10_pvals: number[]
  pos: number

  // state
  x : number
  color : string
}

export interface PhenotypeVariantData {
  unbinned_variants: UnbinnedVariant[]
  variant_bins: VariantBin[]

}

export interface VariantTableConfiguration<RowType> {
     columns: TableColumnConfiguration<RowType>
     defaultSorted : SortingRule<RowType>[]
}

export interface PhenotypeConfiguration {
  banner?: string
  variant : {
    banner?: string
    binary? : { table : VariantTableConfiguration<PhenotypeVariantRow> }
    quantitative? : { table : VariantTableConfiguration<PhenotypeVariantRow> }
  }

  credibleSet : { table : VariantTableConfiguration<CredibleSet> }
  vis_conf : VisConfiguration;
}
