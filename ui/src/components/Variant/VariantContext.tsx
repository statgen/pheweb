import React, { createContext, useState } from "react";
import { fatal } from "../../common/Utilities";
import { Variant, variantFromStr } from "../../common/Model";

export interface VariantState {
  colorByCategory :  { [name: string]: string }
  setColorByCategory : React.Dispatch<React.SetStateAction<{ [name: string]: string }>>
}

interface Props { children: React.ReactNode }

export interface Parameter {
  variant : Variant
  phenocode? : string
}

export const createVariant = (href : string = window.location.href, fail = fatal) : Parameter | never => {
  const match = href.match("/variant/([^/]+)(/pheno/([^/]+))?$")
  if(match){
    const [, variantString, , phenocode, ] = match
    const variant : Variant | undefined = variantFromStr(variantString)
    if(variant){
      return { variant , phenocode };
    }
    return fail(`cant parse variant '${variantString}'`);
  }
  return fail(`cant parse url ${href}`);
}

export const VariantContext = createContext<Partial<VariantState>>({})

const VariantContextProvider = (props : Props) => {
  const [colorByCategory, setColorByCategory] = useState<{ [name: string]: string }| undefined>(undefined);

  return (<VariantContext.Provider value={{ ...props , colorByCategory , setColorByCategory }}>
    {props.children}
  </VariantContext.Provider>)

}

export default VariantContextProvider