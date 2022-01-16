import React, { useEffect } from "react";
import { VariantData } from "./variantModel";
import VariantTable from "./VariantTable";
import { init_locus_zoom } from "../Region/LocusZoom/RegionLocus";
import { DataSources, Plot, populate } from "locuszoom";
import { region_layout } from "../Region/LocusZoom/RegionLayouts";

interface Props { variantData : VariantData }

const element_id : string = 'lz-1'

const VariantLocusZoom = ({ variantData } : Props ) => {
  useEffect(() => {
    const variant : string = `${variantData.chrom}-${variantData.pos}-${variantData.ref}-${variantData.alt}`;
    const panels : string[]  = []

    const element = document.getElementById(element_id);
    if(variantData){
      const dataSources : DataSources = new DataSources();
      const layout = {
        state: {
          variant: variant
        },
        dashboard: {
          components: [
            { type: "download",
              position: "right"}
          ]
        },
        width: 800,
        min_width: 500,
        responsive_resize: true,
        panels: panels,
        mouse_guide: false
      }
      //const plot : Plot = populate('#'+element_id, dataSources, layout);
    }
  },[variantData]);

  return <div className="variant-info col-xs-12">
      <div id={element_id}
           className="lz-locuszoom-container lz-container-responsive"
           data-region={ variantData }>
        &nbsp;
      </div>
  </div>
}

export default VariantLocusZoom