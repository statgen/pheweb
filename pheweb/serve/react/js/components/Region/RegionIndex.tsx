import React , { useState, useEffect , useContext } from 'react'

interface Props {};
import RegionMessage from "./RegionMessage";
import RegionLocusZoom from "./RegionLocusZoom";
import RegionColocalization from "./RegionColocalization";
import RegionBanner from "./RegionBanner";
import RegionSummary from "./RegionSummary";
import RegionContextProvider from "./RegionContext";
import ColocalizationContextProvider from "./Colocalization/ColocalizationContext";
import {RegionErrorBoundary} from "./RegionErrorBoundary";


const Region = (props : Props) => {
    return (<RegionErrorBoundary>
        <RegionContextProvider>
            <ColocalizationContextProvider>
                <div className="container-fluid"  style={{ width : "95%"}}>
                    <RegionBanner/>
                    <RegionSummary/>
                    <RegionMessage/>
                    <RegionLocusZoom/>
                    <RegionColocalization/>
                </div>
            </RegionContextProvider>
          </ColocalizationContextProvider>
        </RegionErrorBoundary>)
}


export default Region;
