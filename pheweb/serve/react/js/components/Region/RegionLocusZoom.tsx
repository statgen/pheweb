import React, {useContext, useEffect} from "react";
import {RegionContext, RegionState} from "./RegionContext";
import ColocalizationProvider, {
    ColocalizationContext,
    ColocalizationState
} from "./Colocalization/ColocalizationContext";
import ColocalizationList from "./Colocalization/ColocalizationList";
import {getRegion} from "./RegionAPI";
import {init_locus_zoom} from "./LocusZoom/RegionLocus";

interface Props {}

const RegionLocusZoom =  (props : Props) => {
    const { locusZoomData } = useContext<Partial<ColocalizationState>>(ColocalizationContext);
    const { region } = useContext<Partial<RegionState>>(RegionContext);

    useEffect(() => { //getRegion(parameter,setRegion);
        const element = document.getElementById('lz-1');
        const msg = `${region} ${locusZoomData} ${element}`;
        console.log(msg);
        if(region && locusZoomData && element){
            init_locus_zoom(region);
        }
    },[locusZoomData, region]);


    if(region) {
        console.log("...render...");
        return (<div className="row">
            <div className="col-xs-12">
                <div id="lz-1" className="lz-locuszoom-container lz-container-responsive" data-region={ JSON.stringify(region) }></div>
            </div>
        </div>);

    } else {
        return (<div className="row"></div>);
    }

}

export default RegionLocusZoom;