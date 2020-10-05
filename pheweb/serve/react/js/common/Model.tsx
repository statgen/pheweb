https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object

interface CasualVariant {
  readonly variation_alt: string,
  readonly variation_chromosome: string,
  readonly beta1 : number,
  readonly beta2 : number,
  readonly variant1? : Variant,
  readonly variant2? : Variant,
  readonly id : string,
  readonly pip1 : number,
  readonly pip2 : number,
  readonly rsid1: string,
  readonly rsid2: string,
  readonly varid1 : string,
  readonly varid2 : string,
};
export { CasualVariant };

export interface Colocalization {
  readonly id : number ,

  readonly source1 : string ,
  readonly source2 : string ,
  readonly phenotype1 : string,
  readonly phenotype1_description : string,
  readonly phenotype2 : string,
  readonly phenotype2_description : string,
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

  readonly cs_size_1: number;
  readonly x: number;

};

export interface Variant {
  readonly chromosome : string
  readonly position : number
  readonly reference : string
  readonly alternate : string
}

export function variantToStr(variant : Variant) {
  return `${variant.chromosome}:${variant.position}_${variant.reference}/${variant.alternate}`;
}

export function variantFromStr(str : string ) : Variant | undefined {
  let result : Variant | undefined
  const match = str.match("^chr([^_]+)_([\\d]+)_([^_]+)_([^_]+)$")
  if(match){
    const [ ignore, chromosome, position , reference, alternate ] : Array<string> = match;
    result = { chromosome, position : parseInt(position, 10) , reference, alternate
    }
  } else { result = undefined; }
  return result;
}

export interface Locus {
  readonly chromosome : string
  readonly start : number
  readonly stop : number
}

export function locusToStr(locus : Locus) {
  return `${locus.chromosome}:${locus.start}-${locus.stop}`;
}

export function locusFromStr(str : string ) : Locus | undefined {

  let result : Locus | undefined
  const match = str.match("^([A-Za-z0-9]+):([0-9]+)-([0-9]+)$")
  if(match){
    const [ ignore, chromosome, start , stop ] : Array<string> = match;

    result = { chromosome,
      start:  +start ,
      stop : +stop }
  } else { result = undefined; }
  return result;
}