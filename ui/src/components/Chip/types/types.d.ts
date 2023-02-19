export type TableProps = {
  query?: string;
};

export interface ApiError {
  status: string;
  data: {
    message: string;
    status: number;
  };
  originalStatus?: number;
}

export interface VariantResult {
  pheno: { name: string; code: string };
  variant: string;
  mlogp_add: number;
  beta_add: number;
  sebeta_add: number;
  mlogp_rec: number;
  beta_rec: number;
  sebeta_rec: number;
  mlogp_chip: number;
  beta_chip: number;
  sebeta_chip: number;
  rec_add?: number | null;
  af_alt?: number;
  is_top_pheno?: boolean;
  is_top_variant?: boolean;
  anno?: VariantAnnotation;
  possible_explaining_signals: string;
}

export interface VariantAnnotation {
  AF: number;
  INFO: number | string;
  rsid: string;
  most_severe: string;
  gene_most_severe: string;
}

export interface VariantResults {
  variant: string;
  time: number;
  results: [VariantResult];
  anno: { [key: string]: VariantAnnotation };
}
