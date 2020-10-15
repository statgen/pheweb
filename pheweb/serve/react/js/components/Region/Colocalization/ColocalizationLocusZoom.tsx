import { selectAll} from 'd3' ;
import {CasualVariant, Colocalization, Variant, variantFromStr} from "../../../common/Model";
import {CasualVariantVector, EMPTY, LocusZoomData} from "./ColocalizationModel";
import {useContext, useEffect} from "react";
import {ColocalizationContext, ColocalizationState} from "./ColocalizationContext";
import {DataLayer, Panel} from "locuszoom";
import {RegionContext, RegionState} from "../RegionContext";
import {LocusZoomContext} from "../LocusZoom/RegionLocus";

const refreshLocusZoom = (colocalization : Colocalization | undefined,
                          locusZoomData : LocusZoomData,
                          locusZoomContext : LocusZoomContext,
                          selectedCasualVariant : (c : CasualVariant | undefined) => void ) => {
    const { dataSources ,  plot } = locusZoomContext;
    const title: string = colocalization?`Credible Set : ${colocalization.phenotype2_description} : ${colocalization.tissue2}`:"Credible Set : Colocalization";
    const panel : Panel = plot.panels.colocalization;
    panel.setTitle(title);

    const dataSource = dataSources.sources.colocalization;
    const params : { [key: string ]: any; } = dataSource.params;
    const data : CasualVariantVector = colocalization && locusZoomData && locusZoomData[colocalization.id] || EMPTY;

    panel.data_layers.colocalization_pip1.data = dataSource.parseArraysToObjects(data, params.fields, params.outnames, params.trans);
    panel.data_layers.colocalization_pip2.data = dataSource.parseArraysToObjects(data, params.fields, params.outnames, params.trans);

    panel.data_layers.colocalization_pip1.render();
    panel.data_layers.colocalization_pip2.render();
    panel.render();


    /**
     * Given the index {1,2} to handle return
     * an event handler.
     *
     * @param index pip index
     * @returns event handler
     */
    const mouseOperation = (operation : (identifier : string,data: DataLayer) => void) =>
                           (index : number) =>
                           (event : Event, d : { [ key : string]  : string }, i : number) => {
        const causalvariantid : string | undefined = d["colocalization:causalvariantid"]
        console.log(causalvariantid);
        const value : string | undefined = d[`colocalization:variant${index}`];
        const variant : Variant | undefined = (value && variantFromStr(value)) || undefined;
        if(variant){
            const identifier : string = `${variant.chromosome}${variant.position}_${variant.reference}${variant.alternate}`;
            const finemapping : DataLayer = plot.panels.finemapping.data_layers.associationpvalues;
            const association : DataLayer = plot.panels.association.data_layers.associationpvalues;

            operation(identifier,finemapping);
            finemapping.render();
            operation(identifier,association);
            association.render();
        }
    }
    const mouseOver = (identifier : string,dataLayer: DataLayer) => {
        dataLayer.highlightElement(identifier);
    }
    const mouseOut = (identifier : string,dataLayer: DataLayer) => {
        dataLayer.unhighlightElement(identifier);
    }


    for(const i of [1,2]){
        const selector : string = `[id='lz-${i}.colocalization.colocalization_pip${i}.data_layer'] path`;
        const dots =  selectAll(selector);
        dots.on('mouseover', mouseOperation(mouseOver)(i));
        dots.on('mouseout', mouseOperation(mouseOut)(i));
    }
}

export const locusZoomHandler = () => {
    const { colocalization ,
            locusZoomData ,
            selectedColocalization ,
            selectedCasualVariant } = useContext<Partial<ColocalizationState>>(ColocalizationContext);
    const { locusZoomContext } = useContext<Partial<RegionState>>(RegionContext);

    useEffect(() => { colocalization
                      && locusZoomData
                      && locusZoomContext
                      && selectedCasualVariant
                      && refreshLocusZoom(selectedColocalization, locusZoomData, locusZoomContext); },
        [ colocalization , locusZoomData , selectedColocalization, locusZoomContext ]);
}