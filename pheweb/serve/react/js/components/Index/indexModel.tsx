import { TableColumnConfiguration } from "../../common/tableColumn";

export interface Phenotype {
  gc_lambda : {'0.5' : number}
  lambda?: number
}

export interface IndexConfiguration {
  banner?: string;
  tableColumns: TableColumnConfiguration<{ }>;
}

