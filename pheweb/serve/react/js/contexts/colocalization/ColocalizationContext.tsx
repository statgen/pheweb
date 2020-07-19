import React, { createContext,  useState } from 'react';

export interface Locus {
    chromosome : string,
    start : number,
    stop : number
}

type Phenotype = string;

export interface ColocalizationParameter {
    locus : Locus,
    phenotype : Phenotype
}

export const ColocalizationContext = createContext<Partial<ColocalizationParameter>>();

const ColocalizationContextProvider = (props) => {
    const inital_position = (() => {
	const href = window.location.href
	const match = href.match("\/region\/([^\/]+)\/([A-Za-z0-9]+):([0-9]+)-([0-9]+)$")
	if(match){
	    const [ignore, phenotype, chromosome, start , stop ] = match;
	    return { phenotype, { chromosome, start , stop } }
	} else {
	    return { locus : null,
		     phenotype : null };
	}
    })();
    const [position, setPosition ] = useState(inital_position);
    
    const updatePhenotype = (phenotype) => {
        setPosition({ ...position, phenotype });
    }

    const updateChromosome = (chromosome) => {
        setPosition({ ...position, chromosome });
    }

    const updateStart = (start : number) => {
        setPosition({ ...position, start });
    }

    const updateStop = (stop : number) => {
        setPosition({ ...position, stop });
    }
    return (<ColocalizationContext.Provider value={{position ,
                                                    updatePhenotype ,
                                                    updateChromosome ,
                                                    updateStart ,
                                                    updateStop }}>
                {props.children}
            </ColocalizationContext.Provider>);
}

export default ColocalizationContextProvider;
