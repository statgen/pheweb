import { TableColumnConfiguration } from "../../common/tableColumn";
import { SortingRule } from "react-table";

export namespace Variant {

  export interface Data {
    alt:                         string;
    chrom:                       string;
    nearest_genes:               string;
    phenos:                      Phenotype[];
    pos:                         number;
    ref:                         string;
    regions:                     any[];
    results:                     Result[];
    rsids:                       string;
    tooltip_lztemplate:          string;
    var_top_pheno_export_fields: string[];
    variant:                     Variant;
    variant_name:                string;
    vis_conf:                    VisConf;
  }

  export interface Phenotype {
    af_alt:                  number;
    af_alt_cases:            number;
    af_alt_controls:         number;
    beta:                    number;
    category:                string;
    category_index:          number;
    gc_lambda:               { [key: string]: number };
    mlogp:                   number;
    n_het_cases:             number;
    n_het_controls:          number;
    n_hom_cases:             number;
    n_hom_controls:          number;
    n_hom_ref_cases:         number;
    n_hom_ref_controls:      number;
    num_cases:               number;
    num_cases_prev:          'NA' | number;
    num_controls:            number;
    num_gw_significant:      number;
    num_gw_significant_prev: 'NA' | number;
    phenocode:               string;
    phenostring:             string;
    pval:                    number;
    sebeta:                  number;
  }

  export interface Result {
    beta:             number | null;
    category:         string;
    category_index:   number;
    maf:              number | null;
    maf_case:         number | null;
    maf_control:      number | null;
    matching_results: MatchingResults;
    mlogp?:            number | null;
    n_case:           number;
    n_control:        number;
    n_sample:         "NA" | number | string;
    phenocode:        string;
    phenostring:      string;
    pval:             number | null;
  }

  export interface ResultLZ extends  Result {
    id : string
    x : number
    idx : number
    pScaled : number

    phewas_code : string
    phewas_string  : string
    category_name : string
    color : string
  }

  export interface MatchingResults {
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
    annot:        { [key: string]: string };
    gnomad:       { [key: string]: number };
    nearest_gene: string;
    rsids:        string;
  }

  export interface VisConf {
    info_tooltip_threshold: number;
    loglog_threshold:       number;
    manhattan_colors:       string[];
  }


}

export namespace Ensembl {
  export interface Data {
    source:                  string;
    ambiguity:               string;
    evidence:                string[];
    most_severe_consequence: string;
    name:                    string;
    MAF:                     number;
    minor_allele:            string;
    var_class:               string;
    synonyms:                string[];
    mappings:                Mapping[];
  }

  export interface Mapping {
    coord_system:     string;
    seq_region_name:  string;
    start:            number;
    assembly_name:    string;
    location:         string;
    strand:           number;
    end:              number;
    ancestral_allele: string;
    allele_string:    string;
  }

}

export namespace NCBI {
  export interface Data {
    header:        Header;
    esearchresult: Esearchresult;
  }

  export interface Esearchresult {
    count:            string;
    retmax:           string;
    retstart:         string;
    idlist:           any[];
    translationset:   any[];
    querytranslation: string;
    errorlist:        Errorlist;
    warninglist:      Warninglist;
  }

  export interface Errorlist {
    phrasesnotfound: string[];
    fieldsnotfound:  any[];
  }

  export interface Warninglist {
    phrasesignored:        any[];
    quotedphrasesnotfound: any[];
    outputmessages:        string[];
  }

  export interface Header {
    type:    string;
    version: string;
  }


}

export namespace PubMed {

  export interface Data {
    synonyms:                string[];
    MAF:                     number;
    most_severe_consequence: string;
    source:                  string;
    mappings:                Mapping[];
    var_class:               string;
    minor_allele:            string;
    name:                    string;
    ambiguity:               string;
    evidence:                string[];
  }

  export interface Mapping {
    assembly_name:    string;
    start:            number;
    allele_string:    string;
    coord_system:     string;
    end:              number;
    strand:           number;
    seq_region_name:  string;
    location:         string;
    ancestral_allele: string;
  }

}

export namespace Configuration {

}
export interface VariantConfiguration {
  table : { columns: TableColumnConfiguration<Variant.Phenotype> ,
    defaultSorted : SortingRule<Variant.Phenotype>[] }
  banner?: string;
}
