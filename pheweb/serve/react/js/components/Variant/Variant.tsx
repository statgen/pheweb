import React, { useEffect, useState } from "react";
import { Variant, variantFromStr } from "../../common/Model";
import { VariantData } from "./variantModel";
import { getVariant } from "./variantAPI";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { mustacheDiv } from "../../common/Utilities";
import loading from "../../common/Loading";
import VariantTable from "./VariantTable";
import VariantLocusZoom from "./VariantLocusZoom";

interface Props {}


export const createVariant = (href : string = window.location.href) : Variant | undefined  => {
  const match = href.match("\/variant\/(.+)$")
  if(match){
    const [ignore, variantString ] : Array<string> = match;
    const variant : Variant | undefined = variantFromStr(variantString)
    return variant
  }
}

const default_banner: string = `
<div class="variant-info col-xs-12">
        <h1 style="margin-top:0">
          {{chrom}}:{{pos}}:{{ref}}:{{alt}}
          ({{rsids}})
        </h1>
        <p>Nearest gene:
          <a style="color:black" href="/gene/{{nearest_genes}}">{{nearest_genes}}</a>
        </p>
        <p id="annotation"></p>         

       <p>View in                                                                                                                                                                                                                                                             
          <a href="https://genetics.opentargets.org/variant/{{chrom}}_{{pos}}_{{ref}}_{{alt}}">Open Targets</a> ,
          <a href="https://gnomad.broadinstitute.org/variant/{{chrom}}-{{pos}}-{{ref}}-{{alt}}?dataset=gnomad_r3">gnomAD</a>
       </p>
</div>
`

declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.variant?.banner || default_banner;


const Variant = (props : Props) => {
  const [variantData, setVariantData] = useState<VariantData | null>(null);
  useEffect(() => {
    const variant = createVariant()
    variant && getVariant(variant, setVariantData)
  },[]);

  return variantData == null?loading:
    <React.Fragment>
    <div className="row" style={{ width: '100%' }}>
      <div className="variant-info col-xs-12">
      {mustacheDiv(banner, variantData)}
      <VariantLocusZoom variantData={variantData} />
      <VariantTable variantData={variantData} />
      </div>
    </div>
  </React.Fragment>
}

export default Variant;