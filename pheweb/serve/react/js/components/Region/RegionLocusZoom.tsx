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
    const { locusZoomData  } = useContext<Partial<ColocalizationState>>(ColocalizationContext);
    const { region , setLocusZoomContext } = useContext<Partial<RegionState>>(RegionContext);

    useEffect(() => {
        const element = document.getElementById('lz-1');
        const msg = `${region} ${locusZoomData} ${element}`;
        if(region && locusZoomData && element && setLocusZoomContext){
            setLocusZoomContext(init_locus_zoom(region));
        }
    },[locusZoomData, region, setLocusZoomContext]);



    if(region) {
        return (<div className="row">
            <div className="col-xs-12">
                <div id="lz-1" className="lz-locuszoom-container lz-container-responsive" data-region={ region.region }></div>
            </div>
        </div>);

    } else {
        return (<div className="row"></div>);
    }

}

export default RegionLocusZoom;