import { TableColumnConfiguration } from '../../common/tableColumn'
import { SortingRule } from 'react-table'

export namespace Coding {
  export type Data = Row[]
  export interface Row {
    AF:                number
    INFO:              number
    beta:              number
    enrichment_nfsee:  number
    gene_most_severe:  string
    grch37_locus:      string
    is_top:            number
    most_severe:       string
    n_het_cases:       number
    n_het_controls:    number
    n_hom_cases:       number
    n_hom_controls:    number
    pheno:             string
    phenoname:         string
    pip:               number | 'NA'
    pval:              number
    pval_dominant:     number
    pval_recessive:    number | 'NA'
    rec_dom_log_ratio: number | 'NA'
    rsid:              string
    sebeta:            number
    variant:           string
    variant_category:  string
  }
}

export interface CodingConfiguration {
  table : { columns: TableColumnConfiguration<Coding.Row> , defaultSorted : SortingRule<Coding.Data>[] }
  banner?: string
}
