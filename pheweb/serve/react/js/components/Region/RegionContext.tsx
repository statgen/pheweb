import {createParameter, Region, RegionParameter} from "./RegionModel";
import React, {createContext, Dispatch, SetStateAction, useEffect, useState} from "react";
import {init_locus_zoom, LocusZoomContext} from "./LocusZoom/RegionLocus";
import {getRegion} from "./RegionAPI";

interface Props { children: React.ReactNode }

export interface RegionState {
    readonly region : Region;
    readonly regionParameter : RegionParameter;
    readonly locusZoomContext : LocusZoomContext;
    readonly setLocusZoomContext : (locusZoomContext : LocusZoomContext) => void;
}

export const RegionContext = createContext<Partial<RegionState>>({});

const updateLocusZoom = (region, setLocusZoomContext) => {
    if(region){
        setLocusZoomContext(init_locus_zoom(region));
    }
};

const RegionContextProvider = (props : Props) => {
    const parameter : RegionParameter| undefined = createParameter();
    const [region, setRegion] = useState<Region| undefined>(undefined);
    const [ locusZoomContext, setLocusZoomContext] = useState<LocusZoomContext | undefined>(undefined);

    useEffect(() => { getRegion(parameter,setRegion); },[]);
//    useEffect(() => { region && updateLocusZoom(region, setLocusZoomContext); },[region]);
    return (<RegionContext.Provider value={{ region ,
                                             locusZoomContext,
                                             setLocusZoomContext }}>
        {props.children}
    </RegionContext.Provider>);

}

export default RegionContextProvider;