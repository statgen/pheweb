import React, { createContext,  useState , useEffect } from 'react';
import {Colocalization, Locus, locusFromStr} from '../../common/Model'
import {LocusZoomData, SearchResults, SearchSummary} from "./ColocalizationModel";
import { getSearchResults , getLocusZoomData} from "./ColocalizationAPI";

interface Props { children: React.ReactNode }

export interface ColocalizationParameter {
    readonly locus : Locus,
    readonly phenotype : string ,
};

export interface ColocalizationState {
    readonly parameter : ColocalizationParameter
    readonly colocalization : Colocalization []
    readonly locusZoomData : LocusZoomData
}

export const ColocalizationContext = createContext<Partial<ColocalizationState>>({});


export const createParameter = (href : string = window.location.href) : ColocalizationParameter | undefined  => {
	const match = href.match("\/region\/([^\/]+)\/([^\/]+)$")
	if(match){
        const [ignore, phenotype, locusString ] : Array<string> = match;
        const locus : Locus | undefined = locusFromStr(locusString)
        return locus?{ phenotype, locus  } : undefined
    }
}

const ColocalizationContextProvider = (props : Props) => {
    const parameter : ColocalizationParameter| undefined = createParameter();
    const [colocalization, setColocalization] = useState<Colocalization[]| undefined>(undefined);
    const [locusZoomData, setLocusZoomData] = useState<LocusZoomData| undefined>(undefined);

    useEffect(() => {
        getSearchResults(parameter, setColocalization);
        getLocusZoomData(parameter, setLocusZoomData);
    },[]);

    return (<ColocalizationContext.Provider value={{ parameter ,
                                                     colocalization ,
                                                     locusZoomData }}>
                {props.children}
            </ColocalizationContext.Provider>);
}

export default ColocalizationContextProvider;