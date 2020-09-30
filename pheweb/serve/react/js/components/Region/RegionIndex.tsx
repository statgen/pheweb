import React , { useState, useEffect , useContext } from 'react'

interface Props {};
import RegionMessage from "./RegionMessage";
import RegionLocusZoom from "./RegionLocusZoom";
import RegionColocalization from "./RegionColocalization";
import RegionBanner from "./RegionBanner";
import RegionSummary from "./RegionSummary";

const Region = (props : Props) => {

    return <div className="container-fluid"  style={{ width : "95%"}}>
	            <RegionBanner/>
	            <RegionSummary/>
                <RegionMessage/>
                <RegionLocusZoom/>
                <RegionColocalization/>
           </div>;
}

export default Region;
