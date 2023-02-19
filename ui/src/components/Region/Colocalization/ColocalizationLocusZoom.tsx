import { Colocalization } from "../../../common/Model";
import { CasualVariantVector, EMPTY, filterCasualVariantVector, LocusZoomData } from "./ColocalizationModel";
// @ts-ignore
import { Panel } from "locuszoom";
import { LocusZoomContext } from "../LocusZoom/RegionLocus";
import { updateMousehandler } from "../LocusZoom/MouseHandler";

export const refreshLocusZoom = (setSelectedPosition : (position : number | undefined) => void,
                          colocalization : Colocalization | undefined,
                          locusZoomData : LocusZoomData,
                          locusZoomContext : LocusZoomContext) => {
    const { dataSources ,  plot } = locusZoomContext;
    const title: string = colocalization?`Credible Set : ${colocalization.phenotype2_description ?? 'NA'} : ${colocalization.tissue2 ?? 'NA'}`:"Credible Set : Colocalization";
    const panel : Panel = plot.panels.colocalization;

    panel.setTitle(title);

    const dataSource = dataSources.sources.colocalization;
    const params : { [key: string ]: any; } = dataSource.params;
    const data : CasualVariantVector = (colocalization && locusZoomData && locusZoomData[colocalization.colocalization_id]) || EMPTY;

    const data1 : CasualVariantVector = filterCasualVariantVector(row => row.beta1 != null && row.pip1 != null,data);
    const data2 : CasualVariantVector = filterCasualVariantVector(row => row.beta2 != null && row.pip2 != null,data);


    const render = () => {
        panel.data_layers.colocalization_pip1.data = dataSource.parseArraysToObjects(data1, params.fields, params.outnames, params.trans);
        panel.data_layers.colocalization_pip2.data = dataSource.parseArraysToObjects(data2, params.fields, params.outnames, params.trans);

        panel.data_layers.colocalization_pip1.render();
        panel.data_layers.colocalization_pip2.render();
        panel.render();
    }

    render();

    /* Hack to deal with re-rendering when
     * zoom or scroll is used.  It loads
     * the data erasing the graph.  So it
     * look for a data render event and over
     * writes it.
     */
    panel.on('data_rendered',  render);
    updateMousehandler(setSelectedPosition,dataSources,'colocalization');
}

