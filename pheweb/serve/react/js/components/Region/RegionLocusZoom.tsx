import React, {useContext} from "react";
import {RegionContext, RegionState} from "./RegionContext";
import ColocalizationProvider from "./Colocalization/ColocalizationContext";
import ColocalizationList from "./Colocalization/ColocalizationList";

interface Props {}

const RegionLocusZoom =  (props : Props) => {
    const { locusZoomContext } = useContext<Partial<RegionState>>(RegionContext);
    if(locusZoomContext) {
        return (<div className="row">
            <div className="col-xs-12">
                <div id="lz-1" className="lz-locuszoom-container lz-container-responsive" data-region={ region }></div>
            </div>
        </div>);

    } else {
        return (<div className="row"></div>);
    }

}

export default RegionLocusZoom;