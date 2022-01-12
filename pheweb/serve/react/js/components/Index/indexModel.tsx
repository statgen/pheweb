import { TableColumnConfiguration } from "../../common/tableColumn";

export interface Phenotype {
  gc_lambda : {'0.5' : number}
  lambda?: number
}

export const addLambda = (phenotype: Phenotype) => {
  return { ...phenotype, lambda: phenotype.gc_lambda["0.5"] };
}

export interface IndexConfiguration {
  banner?: string;
  tableColumns: TableColumnConfiguration<{ }>;
}

