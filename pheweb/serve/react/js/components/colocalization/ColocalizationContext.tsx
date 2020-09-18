import React, { createContext,  useState } from 'react';
import { Locus , stringToLocus } from './model'

interface Props {
    children: React.ReactNode
}


export interface ColocalizationParameter {
    locus : Locus,
    phenotype : string ,
};

export interface ColocalizationState {
    parameter : ColocalizationParameter,
    setParameter : React.Dispatch<React.SetStateAction<ColocalizationParameter>>
}

export const ColocalizationContext = createContext<Partial<ColocalizationState>>({});


const createParameter = () : ColocalizationParameter | undefined  => {
	const href = window.location.href
	const match = href.match("\/region\/([^\/]+)\/([^\/]+)$")
	if(match){
        const [ignore, phenotype, locusString ] : Array<string> = match;
        const locus = stringToLocus(locusString)

        return locus?{ phenotype, locus  } : undefined
    }

const ColocalizationContextProvider = (props : Props) => {
    const inital_parameter = createParameter();
    const [parameter, setParameter ] = useState<ColocalizationParameter| undefined>(inital_parameter);
    

    return (<ColocalizationContext.Provider value={{parameter ,
                                                   setParameter }}>
                {props.children}
            </ColocalizationContext.Provider>);
}

export default ColocalizationContextProvider;

