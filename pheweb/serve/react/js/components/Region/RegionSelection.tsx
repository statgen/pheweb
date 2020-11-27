import React, {useContext, useEffect} from "react";
import {RegionContext, RegionState} from "./RegionContext";
import RegionSelectFinemapping from "./LocusZoom/RegionSelectFinemapping";
import {getRegion} from "./RegionAPI";
import {DataSourceKeys} from "./RegionModel";
import {processMouseUpdates, updateMousehandler} from "./LocusZoom/MouseHandler";
import {DataSources} from "locuszoom";

interface  Props {}

const scatters :  DataSourceKeys[] = ['association', 'conditional', 'finemapping', 'gwas_cat', 'colocalization']
const RegionSelection =  (props : Props) => {
    const { region, setSelectedPosition , locusZoomContext } = useContext<Partial<RegionState>>(RegionContext);
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