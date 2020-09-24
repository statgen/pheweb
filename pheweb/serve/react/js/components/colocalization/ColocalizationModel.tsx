import { setFlagsFromString } from "v8";
import { Variant , Locus , Colocalization, CasualVariant , variantFromStr } from "../../common/Model";

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

export interface SearchSummary {
    unique_phenotype2: number,
    unique_tissue2: number,
};

export interface SearchSummary {
    count : number
    unique_phenotype2 : number
    unique_tissue2 : number
}
export type SubstituteType<T, A, B> =
    T extends A
        ? B
        : T extends {}
        ? { [K in keyof T]: SubstituteType<T[K], A, B> }
        : T;
type ResponseColocalization = SubstituteType<Colocalization, Variant | undefined, String>

export interface SearchResults {
    count : number
    colocalizations : ResponseColocalization[]
}



const hydrateColocalization = (c : ResponseColocalization) : Colocalization => { return {
    ...c,
    locus_id1 : variantFromStr(c.locus_id1 as string),
    locus_id2 : variantFromStr(c.locus_id2 as string)
} as Colocalization }

export const searchResultsColocalization = (c : SearchResults) : Colocalization [] => c.colocalizations.map(hydrateColocalization)

export interface PhenotypeList {
    phenotypes : string []
}

export type LocusZoomData = { [ key: string]: CasualVariantVector };
