import React, { useContext, useEffect } from "react";
import { DataSources , populate } from "locuszoom";
import { GeneContext, GeneState } from "./GeneContext";
import loading from "../../common/Loading";

interface Props {}

const element_id : string = 'lz-1'

const loadLocusZoom = (phenotype : string) => {

  const localBase : string = `/api/region/${phenotype}/lz-`
  const apiBase : string = 'https://portaldev.sph.umich.edu/api/v1/';
  const dataSources = new DataSources()
  dataSources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}])
  const layout = {
    width: 500,
    height: 500,
    min_width: 500,
    min_height: 500,
    panels: [
      { id: "association",
        data_layers: [
          {
            id: "association",
            type: "scatter",
            id_field: "association:position",
            fields: ["association:position", "association:mlogp"],
            x_axis: { field: "association:position" },
            y_axis: { field: "association:mlogp" }
          }
        ]
      }
    ]
  };
  const plot = populate('#lz-1', dataSources, layout);


}

const GeneLocusZoom = (props : Props) => {
  const { genePhenotype , selectedPhenotype } = useContext<Partial<GeneState>>(GeneContext);
  useEffect(() => {
    if(selectedPhenotype != undefined && selectedPhenotype != null) {
      loadLocusZoom(selectedPhenotype.pheno.phenocode)
    }

  },[genePhenotype,selectedPhenotype])

  if(genePhenotype != undefined &&
     genePhenotype != null &&
    selectedPhenotype != undefined &&
    selectedPhenotype != null
     ){
    const { region : { start , end , chrom } } = genePhenotype
    const data_region = `${chrom}:${start}-${end}`
    const body = <div id={element_id}
                      data-region={data_region}
                      className="lz-locuszoom-container lz-container-responsive">
    </div>
    return  body
  } else {
    return loading;
  }
}
export default GeneLocusZoom
