import React from "react";
import RegionMessage from "./RegionMessage";
import RegionLocusZoom from "./RegionLocusZoom";
import RegionColocalization from "./RegionColocalization";
import RegionBanner from "./RegionBanner";
import RegionSummary from "./RegionSummary";
import RegionContextProvider from "./RegionContext";
import ColocalizationContextProvider from "./Colocalization/ColocalizationContext";
import RegionSelection from "./RegionSelection";


interface Props {};
const Region = (props : Props) => {
    return (
        <RegionContextProvider>
            <ColocalizationContextProvider>
                <div className="container-fluid"  style={{ width : "95%"}}>
                    <RegionBanner/>
                    <RegionSummary/>
                    <RegionSelection/>
                    <RegionMessage/>
                    <RegionLocusZoom/>
                    <RegionColocalization/>
                </div>
            </ColocalizationContextProvider>
          </RegionContextProvider>)
}

export default Region;
