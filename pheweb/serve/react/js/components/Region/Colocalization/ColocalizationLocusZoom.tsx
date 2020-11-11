import { selectAll} from 'd3' ;
import {CasualVariant, Colocalization, Variant, variantFromStr} from "../../../common/Model";
import {CasualVariantVector, EMPTY, LocusZoomData} from "./ColocalizationModel";
// @ts-ignore
import {useContext, useEffect} from "react";
import {ColocalizationContext, ColocalizationState} from "./ColocalizationContext";
import {DataLayer, Panel} from "locuszoom";
import {RegionContext, RegionState} from "../RegionContext";
import {LocusZoomContext} from "../LocusZoom/RegionLocus";

const refreshLocusZoom = (colocalization : Colocalization | undefined,
                          locusZoomData : LocusZoomData,
                          locusZoomContext : LocusZoomContext) => {
    const { dataSources ,  plot } = locusZoomContext;
    const title: string = colocalization?`Credible Set : ${colocalization.phenotype2_description ?? 'NA'} : ${colocalization.tissue2 ?? 'NA'}`:"Credible Set : Colocalization";
    const panel : Panel = plot.panels.colocalization;
    panel.setTitle(title);

    const dataSource = dataSources.sources.colocalization;
    const params : { [key: string ]: any; } = dataSource.params;
    const data : CasualVariantVector = colocalization && locusZoomData && locusZoomData[colocalization.colocalization_id] || EMPTY;
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
        const causalVariantId : string | undefined = d["colocalization:causal_variant_id"]
        console.log(causalVariantId);
        const value : string | undefined = d[`colocalization:variant`];
        const variant : Variant | undefined = (value && variantFromStr(value)) || undefined;
        if(variant){
            const identifier : string = `${variant.chromosome}${variant.position}_${variant.reference}${variant.alternate}`;

            const association : DataLayer = plot.panels.association.data_layers.associationpvalues;
            const clinvar : DataLayer = plot.panels.clinvar.data_layers.associationpvalues;
            const finemapping : DataLayer = plot.panels.finemapping.data_layers.associationpvalues;
            //const genes : DataLayer =
            const gwas_cat : DataLayer = plot.panels.gwas_cat.data_layers.associationpvalues;

            [association , clinvar, finemapping, gwas_cat].forEach(dataLayer => {
                //operation(identifier,dataLayer);
                //dataLayer.render();
            })
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
        dots.on('mouseover', mouseOperation(mouseOver)(i) as () => void);
        dots.on('mouseout', mouseOperation(mouseOut)(i) as () => void);
    }
}

export const locusZoomHandler = () => {
    const { colocalization ,
            locusZoomData ,
            selectedColocalization } = useContext<Partial<ColocalizationState>>(ColocalizationContext);
    const { locusZoomContext } = useContext<Partial<RegionState>>(RegionContext);

    useEffect(() => { colocalization
                      && locusZoomData
                      && locusZoomContext
                      && refreshLocusZoom(selectedColocalization, locusZoomData, locusZoomContext); },
        [ colocalization , locusZoomData , selectedColocalization, locusZoomContext ]);
}