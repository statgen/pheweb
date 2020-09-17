export interface Variant {
  readonly chromosome : string;
  readonly position : number;
  readonly reference : string;
  readonly alternate : string;
};

const variantFromVarid = (varid : string) : Variant | undefined => undefined
const varaintFromRsid = (rsid : string) : Variant | undefined => undefined
const varaintFromVariant = (rsid : string) : Variant  | undefined => undefined
