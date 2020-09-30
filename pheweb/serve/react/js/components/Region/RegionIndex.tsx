import React , { useState, useEffect , useContext } from 'react'

interface Props {};
import { VisConf , LzConf, Phenotype, Region } from './components';
import Summary from './Colocalization/ColocalizationSummary'
import List from './Colocalization/ColocalizationList'
import { init_locus_zoom, LocusZoomContext } from './LocusZoom/RegionLocus'
import ColocalizationProvider from './Colocalization/ColocalizationContext'
import styles from './region.css'
import RegionMessage from "./RegionMessage";
import RegionLocusZoom from "./RegionLocusZoom";
import RegionColocalization from "./RegionColocalization";

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
