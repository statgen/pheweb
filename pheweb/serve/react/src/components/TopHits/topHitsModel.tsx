import { TableColumnConfiguration } from "../../common/tableColumn";

export interface TopHitsRow {
  af_alt: number,
  af_alt_cases: number,
  af_alt_controls: number,
  alt: string,
  beta: number,
  chrom: string,
  mlogp: number,
  nearest_genes: string,
  peak: boolean,
  phenocode: string,
  pos: number,
  pval: number,
  ref: string,
  rsids: string,
  sebeta: number
}

export type TopHitsData = TopHitsRow []

export interface TopHitsConfiguration {
  tableColumns? : TableColumnConfiguration<TopHitsRow>
  banner?: string;
}


