import { selectAll} from 'd3' ;
import {CasualVariant, Colocalization, Variant, variantFromStr} from "../../../common/Model";
import {CasualVariantVector, EMPTY, filterCasualVariantVector, LocusZoomData} from "./ColocalizationModel";
// @ts-ignore
import {useContext, useEffect} from "react";
import {ColocalizationContext, ColocalizationState} from "./ColocalizationContext";
import {DataLayer, Panel} from "locuszoom";
import {RegionContext, RegionState} from "../RegionContext";
import {LocusZoomContext} from "../LocusZoom/RegionLocus";
import {updateMousehandler} from "../LocusZoom/MouseHandler";

const refreshLocusZoom = (selectedPosition : number | undefined,
                          setSelectedPosition : (position : number | undefined) => void,
                          colocalization : Colocalization | undefined,
                          locusZoomData : LocusZoomData,
                          locusZoomContext : LocusZoomContext) => {
    const { dataSources ,  plot } = locusZoomContext;
    const title: string = colocalization?`Credible Set : ${colocalization.phenotype2_description ?? 'NA'} : ${colocalization.tissue2 ?? 'NA'}`:"Credible Set : Colocalization";
    const panel : Panel = plot.panels.colocalization;
    panel.setTitle(title);

    const dataSource = dataSources.sources.colocalization;
    const params : { [key: string ]: any; } = dataSource.params;
    const data : CasualVariantVector = colocalization && locusZoomData && locusZoomData[colocalization.colocalization_id] || EMPTY;

    const data1 : CasualVariantVector = filterCasualVariantVector(row => row.beta1 != null && row.pip1 != null,data);
    const data2 : CasualVariantVector = filterCasualVariantVector(row => row.beta2 != null && row.pip2 != null,data);

    panel.data_layers.colocalization_pip1.data = dataSource.parseArraysToObjects(data1, params.fields, params.outnames, params.trans);
    panel.data_layers.colocalization_pip2.data = dataSource.parseArraysToObjects(data2, params.fields, params.outnames, params.trans);

    panel.data_layers.colocalization_pip1.render();
    panel.data_layers.colocalization_pip2.render();
    panel.render();
}

export const locusZoomHandler = () => {
    const { colocalization ,
            locusZoomData ,
            selectedColocalization } = useContext<Partial<ColocalizationState>>(ColocalizationContext);
    const { locusZoomContext , selectedPosition,setSelectedPosition } = useContext<Partial<RegionState>>(RegionContext);

    useEffect(() => {
                      selectedPosition
                      && setSelectedPosition
                      && colocalization
                      && locusZoomData
                      && locusZoomContext
                      && refreshLocusZoom(selectedPosition,setSelectedPosition,selectedColocalization, locusZoomData, locusZoomContext); },
        [ selectedPosition,setSelectedPosition , colocalization , locusZoomData , selectedColocalization, locusZoomContext ]);
}