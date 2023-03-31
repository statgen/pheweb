import { Locus, locusFromStr } from "../../common/commonModel";
import { VisConfiguration } from "../Configuration/configurationModel";

export type DataSourceKeys =
  | "association"
  | "conditional"
  | "finemapping"
  | "colocalization"
  | "gene"
  | "constraint"
  | "gwas_cat"
  | "clinvar"
  | "ld"
  | "recomb";

export interface Params {
  allData: { type: layout_types; data: unknown; conditioned_on: string }[];
  fields: unknown;
  outnames: unknown;
  trans: unknown;
  dataIndex: number;
  lookup: { [key: string]: number };
  handlers: ((position: number | undefined) => void)[] | undefined;
}

export interface RegionParams<regionType = string> {
  readonly locus: regionType;
  readonly phenotype: string;
}

export const createParameter = (
  parameter: RegionParams | undefined
): RegionParams<Locus> | undefined => {
  const locus: Locus | undefined = locusFromStr(parameter?.locus);
  return locus ? { phenotype: parameter?.phenotype, locus } : undefined;
};

export interface Phenotype {
  readonly num_cases: number;
  readonly num_cases_prev: number;
  readonly num_controls: number;
  readonly phenocode: string;
  readonly phenostring: string;
  readonly category: string;
}

export namespace Region {
  export interface LzConfiguration {
    readonly p_threshold: number;
    readonly assoc_fields: Array<string>;
    readonly ld_ens_pop: string;
    readonly ld_ens_window: number;
    readonly ld_max_window: number;
    readonly ld_service: string;
    readonly prob_threshold: number;
    readonly ld_panel_version: string;
    readonly tooltip_html: string;
  }

  export interface Configuration {
    readonly vs_configuration?: VisConfiguration;
    readonly lz_configuration?: LzConfiguration;
  }
}

export type layout_types =
  | "finemap"
  | "susie"
  | "association"
  | "genes"
  | "clinvar"
  | "gwas_cat"
  | "colocalization"
  | "conditional";

export interface CondFMRegions {
  chr: number;
  end: number;
  n_signals: number;
  n_signals_prob: number;
  path: string;
  start: number;
  type: layout_types;
  variants: string;
}

export type cond_fm_regions_types = CondFMRegions[] | undefined | null;

export interface Region {
  readonly pheno: Phenotype;
  readonly cond_fm_regions: cond_fm_regions_types;
  readonly region: string;
}
