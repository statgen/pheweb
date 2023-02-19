import { TableColumnConfiguration } from "../../common/tableColumn";


export type ChipDataCell = string | number;

export interface ChipData {
  columns: string[];
  data: ChipDataCell[];
}

export interface ChipConfiguration {
  banner?: string;
  tableColumns: TableColumnConfiguration<{ }>;
}
