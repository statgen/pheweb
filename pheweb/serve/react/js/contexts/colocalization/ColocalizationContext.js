import React, { createContext,  useState } from 'react';

export const ColocalizationContext = createContext();

const ColocalizationContextProvider = (props) => {
    const inital_position = (() => {
	const href = window.location.href
	const match = href.match("\/region\/([^\/]+)\/([A-Za-z0-9]+):([0-9]+)-([0-9]+)$")
	if(match){
	    const [ignore, phenotype, chromosome, start , stop ] = match;
	    return { phenotype, chromosome, start , stop }
	} else {
	    return { phenotype : null,
		     chromosome : null,
		     start : null,
		     stop : null };
	}
    })();
    const [position, setPosition ] = useState(inital_position);
    
    const updatePhenotype = (phenotype) => {
        setPosition({ ...position, phenotype });
    }

    const updateChromosome = (chromosome) => {
        setPosition({ ...position, chromosome });
    }

    const updateStart = (start) => {
        setPosition({ ...position, start });
    }

    const updateStop = (stop) => {
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
