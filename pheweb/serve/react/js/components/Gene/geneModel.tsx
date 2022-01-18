import { TableColumnConfiguration } from "../../common/tableColumn";

export namespace Gene {

  export interface DrugsConfiguration {
    banner?: string
    tableColumns? : TableColumnConfiguration<GeneDrugs.Row>
  }

  export interface GenePhenotypeConfiguration {
    banner?: string
    footer?:string
    tableColumns? : TableColumnConfiguration<GenePhenotypes.ViewRow>
  }

  export interface GeneLossOfFunctionConfiguration {
    banner?: string
    empty?: string
    tableColumns? : TableColumnConfiguration<LossOfFunction.ViewRow>
  }

  export interface GeneFunctionalVariants {
    banner?: string
    empty? : string
    tableColumns? : TableColumnConfiguration<FunctionalVariants.ViewRow>
  }

  export interface Configuration {
    banner?: string
    phenotype? : GenePhenotypeConfiguration
    lossOfFunction? : GeneLossOfFunctionConfiguration
    functionalVariants? : GeneFunctionalVariants
    drugs? : DrugsConfiguration
  }
}


export namespace FunctionalVariants {

  export interface ViewRow {
    rsids : string ,
    alt : string ,
    chr : number,
    pos : number ,
    ref : string ,
    most_severe : string ,
    info : string ,
    maf : number
    fin_enrichment : string
    significant_phenos: SignificantPheno[] }
  export type Data = Row[]

  export interface Row {
    rsids:              string
    significant_phenos: SignificantPheno[]
    var:                Var
  }

  export interface SignificantPheno {
    beta:             number
    category:         string
    category_index:   number | null
    maf:              number
    maf_case:         number
    maf_control:      number
    matching_results: {}
    mlogp:            number
    n_case:           number
    n_control:        number
    n_sample:         'NA' | number
    phenocode:        string
    phenostring:      string
    pval:             number
  }

  export interface Var {
    alt:        string
    annotation: Annotation
    chr:        number
    pos:        number
    ref:        string
    varid:      string
  }

  export interface Annotation {
    annot:        { [key: string]: string }
    nearest_gene: string
    rsids:        string
    gnomad?:      { [key: string]: string }
  }
}

export namespace LossOfFunction {
  export type Data = Row[]

  export  interface ViewRow {
    phenostring : string
    phenocode : string

    variants : string
    pval:         number;
    beta:            number;

    alt_count_cases: number;
    alt_count_ctrls: number;

    ref_count_cases: number;
    ref_count_ctrls: number;
  }

  export interface Row {
    gene_data: GeneData;
  }

  export interface GeneData {
    ac:              number;
    af:              number;
    alt_count_cases: number;
    alt_count_ctrls: number;
    beta:            string;
    gene:            string;
    id:              number;
    n:               number;
    p_value:         number;
    pheno:           string;
    phenostring:     string;
    ref_count_cases: number;
    ref_count_ctrls: number;
    rel:             number;
    se:              number;
    variants:        string;
  }

}
export namespace GeneDrugs {
  export type Data = Row[]
  export type View = {}

  export interface Row {
    approvedName?:              string;
    diseaseName?:               string;
    drugId?:                    string;
    drugType?:                  string;
    maximumClinicalTrialPhase?: number;
    mechanismOfAction:         string;
    phase:                     number;
    prefName:                  string;
    targetClass:               string[];
    EFOInfo?:                  string;
  }
}
export namespace GenePhenotypes {

  export interface ViewRow {
    num_cases : number
    beta : number
    rsids: string
    fin_enrichment: string
    mlogp : number
    phenostring : string
    phenocode : string
    category : string
    pval : number
    chrom : number
    pos : number
    ref : string
    alt : string
  }
    export type Data = Row[]

  export interface Row {
    assoc:   Assoc;
    pheno:   Pheno;
    variant: Variant;
  }

  export interface Assoc {
    beta:             number;
    category:         string;
    category_index:   number | null;
    maf:              number;
    maf_case:         number;
    maf_control:      number;
    matching_results: {};
    mlogp:            number;
    n_case:           number;
    n_control:        number;
    n_sample:         number | "NA";
    phenocode:        string;
    phenostring:      string;
    pval:             number;
  }


  export interface Pheno {
    assoc_files:             string[];
    category:                string;
    category_index?:         number;
    gc_lambda:               { [key: string]: number };
    num_cases:               number;
    num_cases_prev:          "NA" | number;
    num_controls:            number;
    num_gw_significant:      number;
    num_gw_significant_prev: "NA" | number;
    phenocode:               string;
    phenostring:             string;
  }

  export interface Variant {
    alt:        string;
    annotation: Annotation;
    chr:        number;
    pos:        number;
    ref:        string;
    varid:      string;
  }

  export interface Annotation {
    gnomad?:       { [key: string]: (string | number) };
    nearest_gene: string;
    rsids?:       string;
  }


}

export namespace MyGene {
  export interface Data {
    took: number;
    total: number;
    max_score: number;
    hits: Hit[];
  }

  export interface Hit {
    MIM: string;
    _id: string;
    _score: number;
    ensembl: Ensembl;
    entrezgene: string;
    name: string;
    summary: string;
    symbol: string;
  }

  export interface Ensembl {
    gene: string;
  }
}
