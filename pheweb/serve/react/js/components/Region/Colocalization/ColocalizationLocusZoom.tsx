/*
const updateLocusZoom = (locusZoomData : { [key : number] : CasualVariantVector} | undefined,context : LocusZoomContext,colocalization : Colocalization | undefined) => {
    const { dataSources ,  plot } = context;
    const title: string = colocalization?`Credible Set : ${colocalization.phenotype2_description} : ${colocalization.tissue2}`:"Credible Set : Colocalization"
    const panel : Panel = plot.panels.colocalization
    panel.setTitle(title)

    const dataSource = dataSources.sources.colocalization;
    const params : { [key: string ]: any; } = dataSource.params;
    const data : CasualVariantVector = colocalization && locusZoomData && locusZoomData[colocalization.id] || EMPTY;

    const pip : number [] = [ ... data.pip1 , ... data.pip2]
    var [min, max] = pip.reduce<number[]>((acc,value) => acc === undefined ?
                                            [value,value]
                                            :
                                            [Math.min(acc[0],value), Math.max(acc[1],value)],
                                            [1,0])
    const margin : number = max == min ?0.5:(max - min)*0.05
    const min_extent : number[] = [min === 1?0:Math.max(min -= margin,0),max === 0?1:Math.min(max += margin,1)]

    panel.data_layers.colocalization_pip1.data = dataSource.parseArraysToObjects(data,
                                                                                 params.fields,
                                                                                 params.outnames,
                                                                                 params.trans);
    panel.data_layers.colocalization_pip2.data = dataSource.parseArraysToObjects(data,
                                                                                 params.fields,
                                                                                 params.outnames,
                                                                                 params.trans);

    panel.data_layers.colocalization_pip1.render();
    panel.data_layers.colocalization_pip2.render();
    panel.render();


    const mouseOver = (index : number) => (d : { [ key : string]  : string | number}, i : number) => {
      const locus : string = d[`colocalization:varid${index}`] as string
      const re = /^([^:]+):([^:]+):([^:]+):([^:]+)$/;
      const match = re.exec(locus)
      if(match){
          const [ignore,chromosome,position,reference,alternate] = match;
          const finemapping : DataLayer = plot.panels.finemapping.data_layers.associationpvalues;
          const association : DataLayer = plot.panels.association.data_layers.associationpvalues;
          const identifier : string = `${chromosome}${position}_${reference}${alternate}`;
          finemapping.highlightElement(identifier);
          finemapping.render();
          association.highlightElement(identifier);
          association.render();
        }
      console.log(`mouseOver : ${d}:${i} locus : ${locus}`)
    }
    const mouseOut = (index : number) => (d : { [ key : string]  : string | number}, i : number) => {
      const locus : string = d[`colocalization:varid${index}`] as string
      const re = /^([^:]+):([^:]+):([^:]+):([^:]+)$/;
      const match = re.exec(locus)
      if(match){
          const [ignore,chromosome,position,reference,alternate] = match;
          const finemapping : DataLayer = plot.panels.finemapping.data_layers.associationpvalues;
          const association : DataLayer = plot.panels.association.data_layers.associationpvalues;
          const identifier : string = `${chromosome}${position}_${reference}${alternate}`;
          finemapping.unhighlightElement(identifier);
          finemapping.render();
          association.unhighlightElement(identifier);
          association.render();
        }
      console.log(`mouseOut : ${d}:${i} locus : ${locus}`)
  }

    const dots1 =  selectAll("[id='lz-1.colocalization.colocalization_pip1.data_layer'] path");
    dots1.on('mouseover', mouseOver(1));
    dots1.on('mouseout', mouseOut(1));

    const dots2 =  selectAll("[id='lz-1.colocalization.colocalization_pip2.data_layer'] path");
    dots2.on('mouseover', mouseOver(2));
    dots2.on('mouseout', mouseOut(2));

}
 */
import {Colocalization} from "../../../common/Model";
import {LocusZoomData} from "./ColocalizationModel";
import {useContext, useEffect} from "react";
import {ColocalizationContext, ColocalizationState} from "./ColocalizationContext";

const clearLocusZoom = (context : LocusZoomContext) => {

}

const updateLocusZoom = (context : LocusZoomContext,colocalization : Colocalization[]) => {

}

const refreshLocusZoom = (context : LocusZoomContext,colocalization : Colocalization[] | undefined) => {
    if(colocalization){
        updateLocusZoom(context, colocalization);
    } else {
        clearLocusZoom(context);
    }
}

export default const locusZoomHandler = () => {
    const { colocalization , locusZoomData } = useContext<Partial<ColocalizationState>>(ColocalizationContext);
    useEffect(() => { locusZoomData && refreshLocusZoom(locusZoomData, colocalization); },
        [colocalization , locusZoomData]);
}