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
};

