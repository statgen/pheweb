import { Variant , Colocalization, CasualVariant , variantFromStr } from "../../../common/Model";

export interface CasualVariantVector {
    causal_variant_id : number[]

    position : number []

    variant : string[]

    pip1 : number[]
    pip2 : number[]

    beta1 : number[]
    beta2 : number[]
    count_cs : number[]
    phenotype1 : string[]
    phenotype1_description : string[]
    phenotype2 : string[]
    phenotype2_description : string[]
}

export const EMPTY : CasualVariantVector = {
    causal_variant_id : [],

    position : [],

    variant : [],

    pip1 : [],
    pip2 : [],

    beta1 : [],
    beta2 : [],

    count_cs : [],

    phenotype1 : [],
    phenotype1_description : [],
    phenotype2 : [],
    phenotype2_description : []
}

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
type ResponseColocalization = SubstituteType<Colocalization, Variant | undefined, string>
type ResponseCasualVariant = SubstituteType<CasualVariant, Variant | undefined, string>

export interface SearchResults {
    count : number
    colocalizations : ResponseColocalization[]
}

const hydrateCasualVariant = (c : ResponseCasualVariant) : CasualVariant => {
    return { ...c,
             variant : variantFromStr(c.variant as string) } as CasualVariant
}

const hydrateColocalization = (c : ResponseColocalization) : Colocalization => {
    return { ...c,
             locus_id1 : c.locus_id1 && c.locus_id1 != null ?variantFromStr(c.locus_id1 as string): undefined,
             locus_id2 : c.locus_id2 && c.locus_id2 != null ?variantFromStr(c.locus_id2 as string): undefined,
             variants : c.variants.map(hydrateCasualVariant) } as Colocalization }

export const searchResultsColocalization = (c : SearchResults) : Colocalization [] => c.colocalizations.map(hydrateColocalization)

export interface PhenotypeList {
    phenotypes : string []
}

export type LocusZoomData = { [ key: string]: CasualVariantVector };