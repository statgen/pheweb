import { setFlagsFromString } from "v8";

export interface Variant {
    chromosome : string
    position : number
    reference : string
    alternate : string
}

const stringToVariant = (str : string ) : Variant | undefined => {
    return undefined;
}

export interface Locus {
    chromosome : string 
    start : number
    stop : number
}

export const stringToLocus = (str : string ) : Locus | undefined => {
    let result : Locus | undefined
    const match = str.match("^([A-Za-z0-9]+):([0-9]+)-([0-9]+)$")
	if(match){
        const [ chromosome, start , stop ] : Array<string> = match;
        
        result = { chromosome, 
                   start: parseInt(start, 10) ,
                   stop : parseInt(stop, 10) } 
	} else { result = undefined; }
    return result;
}

export interface SearchSummary {
    unique_phenotype2: number,
    unique_tissue2: number,

};
    

export interface CasualVariant {
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
    pip1 : number,
    variant_label? : string
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

    variants_1 : CasualVariant[]
    variants_2 : CasualVariant[]

    cs_size_1: number;
    x: number;

};

export interface CasualVariantVector {
    causalvariantid : number[],
    position : number[],
    varid : string[],
    beta1: number[],
    beta2: number[],
    pip1: number[],
    pip2: number[],
    variant : string[],
    rsid : string[],
    phenotype1 : string [],
    phenotype1_description : string [],
}

export const EMPTY : CasualVariantVector = {
    causalvariantid : [],
    position : [],
    varid : [],
    beta1: [],
    beta2: [],
    pip1: [],
    pip2: [],
    variant : [],
    rsid : [],
    phenotype1 : [],
    phenotype1_description : []
}
export type LocusZoomData = { [ key: string]: CasualVariantVector };
