import React, { createContext,  useState } from 'react';

interface Props {
    children: React.ReactNode
}

export interface Locus {
    chromosome : string,
    start : number,
    stop : number
}

type Phenotype = string;

export interface ColocalizationParameter {
    locus : Locus,
    phenotype : Phenotype ,
};

export interface ColocalizationState {
    parameter : ColocalizationParameter,
    setParameter : React.Dispatch<React.SetStateAction<ColocalizationParameter>>
}


export const ColocalizationContext = createContext<Partial<ColocalizationState>>({});

const ColocalizationContextProvider = (props : Props) => {
    const inital_parameter : ColocalizationParameter = (() => {
	const href = window.location.href
	const match = href.match("\/region\/([^\/]+)\/([A-Za-z0-9]+):([0-9]+)-([0-9]+)$")
	if(match){
        const [ignore, phenotype, chromosome, start , stop ] : Array<string> = match;
        
        return { phenotype, locus : { chromosome, 
                                      start: parseInt(start, 10) ,
                                      stop : parseInt(stop, 10) } }
	} else { return { locus : null , phenotype : null }; }
    })();
    const [parameter, setParameter ] = useState<ColocalizationParameter>(inital_parameter);
    

    return (<ColocalizationContext.Provider value={{parameter ,
                                                   setParameter }}>
                {props.children}
            </ColocalizationContext.Provider>);
}

export default ColocalizationContextProvider;

