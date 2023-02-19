import React, { useContext, useEffect } from "react";
import { RegionContext, RegionState } from "./RegionContext";
import { DataSourceKeys } from "./RegionModel";
import { processMouseUpdates, updateMousehandler } from "./LocusZoom/MouseHandler";

interface  Props {}

const RegionSelection =  (props : Props) => {
    const { setSelectedPosition , locusZoomContext } = useContext<Partial<RegionState>>(RegionContext);
    useEffect(() => {
        if(locusZoomContext && setSelectedPosition){
            const scatters :  DataSourceKeys[] = ['association', 'conditional', 'finemapping', 'gwas_cat', 'colocalization']
            scatters.forEach(key => {
                locusZoomContext.plot.panels[key]?.on('data_rendered', function() {
                    updateMousehandler(setSelectedPosition,locusZoomContext.dataSources,key);
                });
            });
        }
    },[ setSelectedPosition , locusZoomContext ]);


    const { selectedPosition } = useContext<Partial<RegionState>>(RegionContext);
    useEffect(() => {
        (locusZoomContext) && processMouseUpdates(selectedPosition,locusZoomContext.dataSources);
    },[ selectedPosition , locusZoomContext ]);

    return (<div/>);
}

export default RegionSelection;