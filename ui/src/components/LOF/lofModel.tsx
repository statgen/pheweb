import { TableColumnConfiguration } from "../../common/tableColumn";
import { SortingRule } from "react-table";

export namespace LOF {

  export type Data = Row[]
  export interface Row {
  gene_data: GeneData
  }

  export interface GeneData {
  ac:              number
  af:              number
  alt_count_cases: number
  alt_count_ctrls: number
  beta:            number
  gene:            string
  id:              number
  n:               number
  p_value:         number
  pheno:           string
  phenostring:     string
  ref_count_cases: number
  ref_count_ctrls: number
  rel:             number
  se:              number
  variants:        string
  }

}
export interface LOFConfiguration {
  table : { columns: TableColumnConfiguration<LOF.GeneData> , defaultSorted : SortingRule<LOF.GeneData>[] }
  banner?: string
}
