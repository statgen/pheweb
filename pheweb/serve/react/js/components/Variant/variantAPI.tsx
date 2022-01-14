import { VariantData } from "./variantModel";
import { get } from "../../common/Utilities";
import { Variant, variantToPheweb } from "../../common/Model";

export const getVariant= (variant: Variant,
                          sink: (s: VariantData) => void,getURL = get) : void => {
  getURL(`/api/variant/${variantToPheweb(variant)}`, sink)
}