import { CasualVariant, Colocalization, Variant, variantFromStr } from "../../../common/Model";

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

interface CasualVariantRow {
    causal_variant_id : number,
    position : number,
    variant : string,
    pip1 : number,
    pip2 : number,
    beta1 : number,
    beta2 : number,
    count_cs : number,
    phenotype1 : string,
    phenotype1_description : string,
    phenotype2 : string,
    phenotype2_description : string
}



export const filterCasualVariantVector = (predicate : (row : CasualVariantRow) => boolean,causalVector : CasualVariantVector) : CasualVariantVector => {
    const causal_variant_id : number[] = [];
    const position : number [] = [];
    const variant : string[] = [];

    const pip1 : number[] = [];
    const pip2 : number[] = [];

    const beta1 : number[] = [];
    const beta2 : number[] = [];
    const count_cs : number[] = [];
    const phenotype1 : string[] = [];
    const phenotype1_description : string[] = [];
    const phenotype2 : string[] = [];
    const phenotype2_description : string[] = [];

    for(var i : number = 0; i < causalVector.causal_variant_id.length;i++){
        var row = {
            causal_variant_id : causalVector.causal_variant_id[i],
            position : causalVector.position[i],
            variant : causalVector.variant[i],
            pip1 : causalVector.pip1[i],
            pip2 : causalVector.pip2[i],
            beta1 : causalVector.beta1[i],
            beta2 : causalVector.beta2[i],
            count_cs : causalVector.count_cs[i],
            phenotype1 : causalVector.phenotype1[i],
            phenotype1_description : causalVector.phenotype1_description[i],
            phenotype2 : causalVector.phenotype2[i],
            phenotype2_description : causalVector.phenotype2_description[i]
        };
        if(predicate(row)){
                causal_variant_id.push(row.causal_variant_id);
                position.push(row.position);
                variant.push(row.variant);

                pip1.push(row.pip1);
                pip2.push(row.pip2);

                beta1.push(row.beta1);
                beta2.push(row.beta2);


                count_cs.push(row.count_cs);

                phenotype1.push(row.phenotype1);
                phenotype1_description.push(row.phenotype1_description);

                phenotype2.push(row.phenotype2);
                phenotype2_description.push(row.phenotype2_description);
            }
    }

    return { causal_variant_id : causal_variant_id ,
             position : position,
             variant : variant,

             pip1 : pip1,
             pip2 : pip2,

             beta1 : beta1,
             beta2 : beta2,

             count_cs : count_cs,

             phenotype1 : phenotype1,
             phenotype1_description : phenotype1_description,

             phenotype2 : phenotype2,
             phenotype2_description : phenotype2_description };

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