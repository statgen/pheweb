export namespace Clinvar {

export type Data = {
    uid:                            string;
    obj_type:                       string;
    accession:                      string;
    accession_version:              string;
    title:                          string;
    variation_set:                  VariationSet[];
    supporting_submissions:         { [key: string]: string[] };
    germline_classification?:        Classification;
    clinical_impact_classification?: Classification;
    oncogenicity_classification?:    Classification;
    record_status:                  string;
    gene_sort:                      string;
    chr_sort:                       string;
    location_sort:                  string;
    variation_set_name:             string;
    variation_set_id:               string;
    genes:                          Gene[];
    molecular_consequence_list:     string[];
    protein_change:                 string;
    fda_recognized_database:        string;
}

type Classification = {
    description:    string;
    last_evaluated: string;
    review_status:  string;
    trait_set:      TraitSet[];
}

type TraitSet = {
    trait_xrefs: Xref[];
    trait_name:  string;
}

type Xref = {
    db_source: string;
    db_id:     string;
}

type Gene = {
    symbol: string;
    geneid: string;
    strand: string;
    source: string;
}

type VariationSet = {
    measure_id:      string;
    variation_xrefs: Xref[];
    variation_name:  string;
    cdna_change:     string;
    aliases:         any[];
    variation_loc:   VariationLOC[];
    allele_freq_set: AlleleFreqSet[];
    variant_type:    string;
    canonical_spdi:  string;
}

type AlleleFreqSet = {
    source:       string;
    value:        string;
    minor_allele: string;
}

type VariationLOC = {
    status:             string;
    assembly_name:      string;
    chr:                string;
    band:               string;
    start:              string;
    stop:               string;
    inner_start:        string;
    inner_stop:         string;
    outer_start:        string;
    outer_stop:         string;
    display_start:      string;
    display_stop:       string;
    assembly_acc_ver:   string;
    annotation_release: string;
    alt:                string;
    ref:                string;
}

}