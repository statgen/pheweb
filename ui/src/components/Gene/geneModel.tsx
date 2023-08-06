import { TableColumnConfiguration } from "../../common/commonTableColumn";
import {Phenotype as CommonPhenotype } from "../../common/commonModel";

export namespace Gene {

  export interface LzConfiguration {
    tooltip_html? : string
    readonly assoc_fields: {
      readonly quantitative : Array<string>;
      readonly binary : Array<string>;
    };
    ld_panel_version: string
  }

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

  export interface PqtlColocalizationsConfiguration {
    banner?: string
    tableColumns? : TableColumnConfiguration<PqtlColocalizations.Row>
  }

  export interface Configuration {
    banner?: string
    phenotype? : GenePhenotypeConfiguration
    lossOfFunction?  : GeneLossOfFunctionConfiguration | null
    functionalVariants? : GeneFunctionalVariants
    drugs? : DrugsConfiguration
    lz_config? : LzConfiguration
    pqtlColocalizations? : PqtlColocalizationsConfiguration | null
  }
}
export namespace FunctionalVariants {

  export interface ViewRow {
    rsids : string ,
    alt : string ,
    chrom : number,
    pos : number ,
    ref : string ,
    most_severe : string ,
    info : string ,
    maf : number
    fin_enrichment : string
    significant_phenos: SignificantPheno[]
  }
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
    readonly num_cases : number
    readonly beta : number
    readonly sebeta?: number
    readonly rsids: string
    readonly fin_enrichment: string
    readonly mlogp : number
    readonly phenostring : string
    readonly phenocode : string
    readonly category : string
    readonly pval : number
    readonly chrom : number
    readonly pos : number
    readonly ref : string
    readonly alt : string
    readonly gene : string
  }

  export interface  Region {
    readonly chrom : number
    readonly start : number
    readonly end : number
  }

  export type Data = {
    readonly region : Region
    readonly phenotypes : Phenotype[]
  }

  export interface Phenotype {
    readonly assoc:   Association
    readonly pheno:   PhenotypeDetail
    readonly variant: Variant
  }

  export interface Association {
    readonly beta:             number;
    readonly sebeta?:          number;
    readonly category:         string;
    readonly category_index:   number | null;
    readonly maf:              number;
    readonly maf_case:         number;
    readonly maf_control:      number;
    readonly matching_results: {};
    readonly mlogp:            number;
    readonly n_case:           number;
    readonly n_control:        number;
    readonly n_sample:         number | "NA";
    readonly phenocode:        string;
    readonly phenostring:      string;
    readonly pval:             number;
  }


  export type PhenotypeDetail = CommonPhenotype;

  export interface Variant {
    readonly alt:        string;
    readonly annotation: Annotation;
    readonly chr:        number;
    readonly pos:        number;
    readonly ref:        string;
    readonly varid:      string;
  }

  export interface Annotation {
    readonly gnomad?:       { [key: string]: (string | number) };
    readonly nearest_gene: string;
    readonly rsids?:       string;
  }


}

export interface GeneParams {
  gene : string
  phenotype : string
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

export namespace PqtlColocalizations {

  export type Data = Row[]

  export interface Row {
    gene_name: string
    source: string
    trait: string
    region: string
    cs: number
    v: string
    cs_specific_prob: number
    cs_log10bf: number
    cs_min_r2: number
    beta: number
    p: number
    prob: number
    most_severe: string
    gene_most_severe: string
    disease_colocalizations: Colocalization[]
  }

  export interface Colocalization {
    phenotype1: string
    phenotype1_description: string
    clpp: number
    clpa: number
    len_inter: number
    len_cs1: number
    len_cs2: number
  }

}
