import { TableColumnConfiguration } from "../../common/tableColumn";
import { SortingRule } from "react-table";

export interface Phenotype {
  gc_lambda : {'0.5' : number}
  lambda?: number
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