import { TableColumnConfiguration } from "../../common/commonTableColumn";
import { SortingRule } from "react-table";

export interface Phenotype {
  assoc_files?: string[]
  category: string
  category_index: number
  gc_lambda?: GcLambda
  num_cases?: number
  num_controls?: number
  num_gw_significant?: number
  phenocode: string
  phenostring: string
  risteys?: string
}

export interface GcLambda {
  "0.001"?: number
  "0.01"?: number
  "0.1"?: number
  "0.5"?: number
}


export const addLambda = (phenotype: Phenotype) => {
  return { ...phenotype, lambda: phenotype.gc_lambda["0.5"] };
}

export interface IndexConfiguration {
  banner?: string;
  table : { columns: TableColumnConfiguration<Phenotype> ,
            defaultSorted : SortingRule<Phenotype>[] }
  tableColumns: TableColumnConfiguration<Phenotype>;
}