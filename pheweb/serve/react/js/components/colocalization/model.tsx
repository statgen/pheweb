export CausualVariant {
    variation_alt: string,
    variation_chromosome: string,
    beta2 : number,
    variant : string,
    id : string,
    variation_ref : string,
    pip2 : number,
    varid : string,
    variation_position : number,
    beta1 : number,
    rsid: string, 
    position : string,
    pip1 : number
};

export interface Colocalization {
    id : number ,
    
    source1 : string ,
    source2 : string ,
    phenotype1 : string,
    phenotype1_description : string,
    phenotype2 : string,
    phenotype2_description : string,
    tissue1? : string,
    tissue2 : string,

    locus_id1 : string,
    locus_id2 : string,

    chromosome : string,
    start : number,
    stop : number,

    clpp : number,
    clpa : number,
    beta_id1? : number,
    beta_id2? : number,

    variation : string,
    vars_pip1 : string,
    vars_pip2 : string,
    vars_beta1 : string,
    vars_beta2 : string,
    len_cs1 : number,
    len_cs2 : number,
    len_inter : number

    variants_1 : CausualVariant[]
    variants_2 : CausualVariant[]
};

