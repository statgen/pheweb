import { TableColumnConfiguration } from "../../common/tableColumn";
import { SortingRule } from "react-table";

export interface PubMedData {
  synonyms:                any[];
  MAF:                     number;
  most_severe_consequence: string;
  source:                  string;
  mappings:                PubMedMapping[];
  var_class:               string;
  minor_allele:            string;
  name:                    string;
  ambiguity:               string;
  evidence:                string[];
}

export interface PubMedMapping {
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


export interface NCBIData {
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


export interface VariantData {
  alt:                         string;
  chrom:                       string;
  nearest_genes:               string;
  phenos:                      VariantRow[];
  pos:                         number;
  ref:                         string;
  regions:                     Region[];
  results:                     Result[];
  rsids:                       string;
  tooltip_lztemplate:          string;
  var_top_pheno_export_fields: string[];
  variant:                     VariantDetail;
  variant_name:                string;
  vis_conf:                    VisConf;
}

export interface VariantRow {
  af_alt:                  number;
  af_alt_cases:            number;
  af_alt_controls:         number;
  beta:                    number;
  category:                string;
  category_index?:         number;
  gc_lambda:               { [key: string]: number };
  mlogp:                   number;
  num_cases:               number;
  num_cases_prev:          "NA" | number;
  num_controls:            number;
  num_gw_significant:      number;
  num_gw_significant_prev: "NA" | number;
  phenocode:               string;
  phenostring:             string;
  pval:                    number;
  sebeta:                  number;
}

export interface Region {
  chr:       number;
  end:       number;
  path:      string;
  phenocode: string;
  start:     number;
  type:      Type;
}

export enum Type {
  Finemap = "finemap",
  Susie = "susie",
}

export interface Result {
  beta:             number;
  category:         string;
  category_index:   number | null;
  maf:              number;
  maf_case:         number;
  maf_control:      number;
  matching_results: MatchingResults;
  mlogp:            number;
  n_case:           number;
  n_control:        number;
  n_sample:         "NA" | number;
  phenocode:        string;
  phenostring:      string;
  pval:             number;
}

export interface MatchingResults {
}

export interface VariantDetail {
  alt:        string;
  annotation: AnnotationDetail;
  chr:        number;
  pos:        number;
  ref:        string;
  varid:      string;
}

export interface AnnotationDetail {
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


export interface VariantConfiguration {
  table : { columns: TableColumnConfiguration<VariantRow> ,
            defaultSorted : SortingRule<VariantRow>[] }
  banner?: string;
}

export interface EnsemblData {
  most_severe_consequence: string;
  synonyms:                any[];
  evidence:                string[];
  name:                    string;
  minor_allele:            string;
  ambiguity:               string;
  mappings:                Mapping[];
  MAF:                     number;
  var_class:               string;
  source:                  string;
}

export interface Mapping {
  assembly_name:    string;
  start:            number;
  seq_region_name:  string;
  strand:           number;
  ancestral_allele: string;
  coord_system:     string;
  allele_string:    string;
  location:         string;
  end:              number;
}
