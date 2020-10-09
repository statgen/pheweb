import { setFlagsFromString } from "v8";
import { Variant , Locus , Colocalization, CasualVariant , variantFromStr } from "../../../common/Model";

export interface CasualVariantVector {
    causalvariantid : number[]

    position1 : number []
    position2 : number []

    variant1 : string[]
    variant2 : string[]

    pip1 : number[]
    pip2 : number[]

    beta1 : number[]
    beta2 : number[]
    count_variants : number[]
    phenotype1 : string[]
    phenotype1_description : string[]
    phenotype2 : string[]
    phenotype2_description : string[]
}

export const EMPTY : CasualVariantVector = {
    causalvariantid : [],

    position1 : [],
    position2 : [],

    variant1 : [],
    variant2 : [],

    pip1 : [],
    pip2 : [],

    beta1 : [],
    beta2 : [],

    count_variants : [],

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
             variant1 : variantFromStr(c.variant1 as string),
             variant2 : variantFromStr(c.variant2 as string) } as CasualVariant
}

const hydrateColocalization = (c : ResponseColocalization) : Colocalization => {
    return { ...c,
             locus_id1 : variantFromStr(c.locus_id1 as string),
             locus_id2 : variantFromStr(c.locus_id2 as string),
             variants : c.variants.map(hydrateCasualVariant) } as Colocalization }

export const searchResultsColocalization = (c : SearchResults) : Colocalization [] => c.colocalizations.map(hydrateColocalization)

export interface PhenotypeList {
    phenotypes : string []
}

export type LocusZoomData = { [ key: string]: CasualVariantVector };
