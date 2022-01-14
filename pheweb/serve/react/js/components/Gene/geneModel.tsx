import { TableColumnConfiguration } from "../../common/tableColumn";
// https://mygene.info/
interface MyGeneInformationGene { gene: string }

export interface MyGeneInformationHit {
  _id: string
  _score: number
  ensembl? : MyGeneInformationGene | MyGeneInformationGene[]
  entrezgene: string
  name: string
  summary?: string
  symbol: string
  MIM?: string
}

export interface MyGeneInformation{
  took: number
  total: number
  max_score: number
  hits: MyGeneInformationHit[]
}
// api/gene
export interface GeneSummary {
  drug_export_fields:          string[];
  func_var_report_p_threshold: number;
  gene_pheno_export_fields:    string[];
  gene_symbol:                 string;
  ld_panel_version:            string;
  lof_export_fields:           string[];
  lz_conf:                     GeneSummaryLzConf;
  pheno:                       GeneSummaryPheno;
  region:                      string;
  significant_phenos:          GeneSummarySignificantPheno[];
  tooltip_lztemplate:          string;
}

export interface GeneSummaryLzConf {
  assoc_fields:   string[];
  ld_ens_pop:     string;
  ld_ens_window:  number;
  ld_max_window:  number;
  ld_service:     string;
  p_threshold:    number;
  prob_threshold: number;
  tooltip_html:   string;
}

export interface GeneSummaryPheno {
  assoc_files:             string[];
  category:                string;
  category_index:          number;
  gc_lambda:               { [key: string]: number };
  num_cases:               number;
  num_cases_prev:          number;
  num_controls:            number;
  num_gw_significant:      number;
  num_gw_significant_prev: number;
  phenocode:               string;
  phenostring:             string;
}

export interface GeneSummarySignificantPheno {
  assoc: GeneSummaryAssociation;
  pheno: GeneSummarySignificantPhenoPheno;
}

export interface GeneSummaryAssociation {
  af_alt:          number;
  af_alt_cases:    number;
  af_alt_controls: number;
  alt:             string;
  beta:            number;
  chrom:           string;
  mlogp:           number;
  pos:             string;
  pval:            number;
  ref:             string;
  sebeta:          number;
}

export interface GeneSummarySignificantPhenoPheno {
  category:                string;
  category_index?:         number;
  gc_lambda:               { [key: string]: number };
  num_cases:               number;
  num_cases_prev:          number | string;
  num_controls:            number;
  num_gw_significant:      number;
  num_gw_significant_prev: number | string;
  phenocode:               string;
  phenostring:             string;
}


// api/gene_phenos
export type GenePhenotypeData = GenePhenotypeRow[]
export interface GenePhenotypeRow {
  assoc:   GenePhenotypeAssociation;
  pheno:   GenePhenotypePhenotype;
  variant: GeneVariant;
}

// /api/gene_functional_variants
export type GeneFunctionalVariantData = GeneFunctionalVariantRow[]
export interface GeneFunctionalVariantRow {
  rsids:              string;
  significant_phenos: GenePhenotypeAssociation[];
  var:                GeneVariant;
}



export interface GeneVariant {
  alt:        string;
  annotation: GeneAnnotation;
  chr:        number;
  pos:        number;
  ref:        string;
  varid:      string;
}

export interface GeneAnnotation {
  annot?:        { [key: string]: string };
  nearest_gene: string;
  rsids?:        string;
  gnomad?:       { [key: string]: (string | number) };
}



export interface GenePhenotypeAssociation {
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
  n_sample:         string;
  phenocode:        string;
  phenostring:      string;
  pval:             number;
}

export interface GenePhenotypePhenotype {
  assoc_files:             string[];
  category:                string;
  category_index?:         number;
  gc_lambda:               { [key: string]: number };
  num_cases:               number;
  num_cases_prev:          'NA' | number;
  num_controls:            number;
  num_gw_significant:      number;
  num_gw_significant_prev: 'NA' | number;
  phenocode:               string;
  phenostring:             string;
}

// api/drugs
export type GeneDrugData = GeneDrugRow[]
export interface GeneDrugRow {
  approvedName:              string;
  diseaseName:               string;
  drugId:                    string;
  drugType:                  string;
  maximumClinicalTrialPhase: number;
  mechanismOfAction:         string;
  phase:                     number;
  prefName:                  string;
  targetClass:               string[];
  EFOInfo?:                  string;
}


// api/lof
export type GeneLOFData = GeneLOFRow[]
export interface GeneLOFRow {}
//


interface AssociationResultsRow {}

export interface AssociationResultsConfiguration {
  banner?: string
  tableColumns? : TableColumnConfiguration<AssociationResultsRow>
}

export interface LocusZoomConfiguration {
  banner?: string
}

export interface LOFConfiguration {
  banner?: string
  empty?: string
  tableColumns? : TableColumnConfiguration<GeneLOFRow>
}

export interface FunctionalVariantConfiguration {
  banner?: string
  tableColumns? : TableColumnConfiguration<GeneFunctionalVariantRow>
}

export interface GenePhenotypeConfiguration {
  banner?: string
  tableColumns? : TableColumnConfiguration<GenePhenotypeRow>
}

export interface DrugsConfiguration {
  banner?: string
  tableColumns? : TableColumnConfiguration<GeneDrugRow>
}

export interface GeneConfiguration {
  associationResults? : AssociationResultsConfiguration
  lof? : LOFConfiguration
  functionalVariant : FunctionalVariantConfiguration
  genePhenotype : GenePhenotypeConfiguration
  locusZoom? : LocusZoomConfiguration
  drugs? : DrugsConfiguration
  banner?: string;
}
