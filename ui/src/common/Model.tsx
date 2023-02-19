/* eslint camelcase: 0 */
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "ignore" }] */

// https:// stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object

export interface CasualVariant {
  readonly variation_alt: string,
  readonly variation_chromosome: string,
  readonly beta1 : number,
  readonly beta2 : number,
  readonly variant? : Variant,
  readonly id : string,
  readonly pip1 : number,
  readonly pip2 : number,
  readonly rsid1: string,
  readonly rsid2: string,
  readonly varid1 : string,
  readonly varid2 : string,
  readonly count_cs : number;
  readonly membership_cs : number;
};

export interface Colocalization {
  readonly colocalization_id : number,

  readonly source1 : string,
  readonly source2 : string,
  readonly phenotype1 : string,
  readonly phenotype1_description : string,
  readonly phenotype2 : string,
  readonly phenotype2_description : string,

  readonly quant1? :string
  readonly quant2? :string

  readonly tissue1? : string,
  readonly tissue2 : string,

  readonly locus_id1? : Variant,
  readonly locus_id2? : Variant,

  readonly chromosome : string,
  readonly start : number,
  readonly stop : number,

  readonly clpp : number,
  readonly clpa : number,
  readonly beta_id1? : number,
  readonly beta_id2? : number,

  readonly variants : CasualVariant[],
  readonly vars_pip1 : string,
  readonly vars_pip2 : string,
  readonly vars_beta1 : string,
  readonly vars_beta2 : string,
  readonly len_cs1 : number,
  readonly len_cs2 : number,
  readonly len_inter : number

  readonly count_cs: number;
  readonly membership_cs: string;
  readonly x: number;
};

export interface Variant {
  readonly chromosome : number
  readonly position : number
  readonly reference : string
  readonly alternate : string
}

export function variantToStr (variant : Variant) {
  return `${variant.chromosome}:${variant.position}_${variant.reference}/${variant.alternate}`
}

export function variantToPheweb (variant : Variant) {
  return `${variant.chromosome}-${variant.position}-${variant.reference}-${variant.alternate}`
}
/**
 * Convert string to chromosome
 *
 * Chromosomes are stored as numbers and this
 * maps the string representation to a number.
 *
 * @param chr
 * @returns number if can be parsed or undefined
 */
export const stringToChromosome = (chr :string) : (number | undefined) => {
  let result : number | undefined;
  switch(chr){
    case 'X' : { result = 23; break; }
    case 'Y' : { result = 24;  break; }
    case 'M' : { result = 25;  break; }
    case 'MT' : { result = 25; break; }
    case '1' : { result = 1; break; }
    case '2' : { result = 2; break; }
    case '3' : { result = 3;  break; }
    case '4' : { result = 4; break; }
    case '5' : { result = 5; break; }
    case '6' : { result = 6;  break; }
    case '7' : { result = 7; break; }
    case '8' : { result = 8; break; }
    case '9' : { result = 9; break; }
    case '10' : { result = 10; break; }
    case '11' : { result = 11; break; }
    case '12' : { result = 12; break; }
    case '13' : { result = 13; break; }
    case '14' : { result = 14; break; }
    case '15' : { result = 15; break; }
    case '16' : { result = 16; break; }
    case '17' : { result = 17; break; }
    case '18' : { result = 18; break; }
    case '19' : { result = 19; break; }
    case '20' : { result = 20; break; }
    case '21' : { result = 21; break; }
    case '22' : { result = 22; break; }
    case '23' : { result = 23; break; }
    case '24' : { result = 24; break; }
    case '25' : { result = 25; break; }
    default : { result = undefined; break; }
  }
  return result;
}

/**
 * Parse a string and return a variant
 *
 * @param str
 * @returns Variant if string can be parsed undefined otherwise
 *
 */
export function variantFromStr (str : string) : Variant | undefined {
  let result : Variant | undefined
  const match = str.match(/^(chr)?([\da-zA-Z]+)([_:/-])([\d]+)([_:/-])([^_:/-]+)([_:/-])(.+)$/)
  if (match) {
    const [, ,
           chromosomeString,
           , // separator2
           position,
           , // separator3
           reference,
           , // separator4
           alternate] : Array<string> = match
    const chromosome = stringToChromosome(chromosomeString)
    if(chromosome){
      result = { chromosome,
                 position: +position,
                 reference,
                 alternate }
    } else { result = undefined }
  } else { result = undefined }
  return result
}

export interface Locus {
  readonly chromosome : number
  readonly start : number
  readonly stop : number
}

/**
 * String representations of a Locus
 *
 * @param locus
 */
export function locusToStr (locus : Locus) {
  return `${locus.chromosome}:${locus.start}-${locus.stop}`
}

/**
 * Parses a string and returns a Locus
 * object
 *
 * @param str
 * @returns Locus if string could be parsed undefined otherwise
 */
export function locusFromStr (str : string) : Locus | undefined {
  let result : Locus | undefined
  const match = str.match('^([A-Za-z0-9]+):([0-9]+)-([0-9]+)$')
  if (match) {
    const [, chromosomeString, start, stop] : Array<string> = match
    const chromosome = stringToChromosome(chromosomeString)
    if(chromosome){
      result = {
        chromosome,
        start: +start,
        stop: +stop
      }
    } else { result = undefined }
  } else { result = undefined }
  return result
}