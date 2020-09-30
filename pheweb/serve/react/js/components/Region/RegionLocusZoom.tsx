import React, {useContext} from "react";
import {RegionContext, RegionState} from "./RegionContext";
import ColocalizationProvider from "./Colocalization/ColocalizationContext";
import List from "./Colocalization/ColocalizationList";

interface Props {}

const RegionLocusZoom =  (props : Props) => {
    const { locusZoomContext } = useContext<Partial<RegionState>>(RegionContext);
    if(locusZoomContext) {
        return (<div className="row">
                   <div className="col-xs-12" id="colocalization_list_div">
                        <List locusZoomContext={locusZoomContext} />
                   </div>
                </div>);
    } else {
        return (<div className="row"></div>);
    }

}

export default RegionLocusZoom;