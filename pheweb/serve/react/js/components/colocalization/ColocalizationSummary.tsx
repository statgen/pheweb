import React, { useState, useEffect , useContext } from 'react';
import { ColocalizationContext, ColocalizationState } from '../region/ColocalizationContext';
import { Summary } from './model'

interface Prop {}

const Summary = (prop : Prop) => {
/*
    const parameter = useContext<Partial<ColocalizationState>>(ColocalizationContext).parameter;
    useEffect( () => {
        getColocalizationSummary();
    }, [parameter]); // only update on when position is updated

    const [ summary, setSummary] = useState<{ data? : Summary , loading : boolean}>({ data : undefined, loading: true }); // set up summary state
    
    const getColocalizationSummary = () => {
	if(parameter && parameter !== null){
	    const url = `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}/summary?clpa.gte=0.1`;
	    fetch(url).then(response => response.json()).then((d) => { setSummary({  data: d, loading: false, }); } ).catch(function(error){ alert(error);});
	}
    }

    if(parameter == null) {
        return (<p></p>);
    } else if(summary && summary != null && summary.data && summary.data != null ) {
	return (<p>This region has {` ${ summary.data.count }`} colocalizations ,
		{` ${ summary.data.unique_phenotype2 }`} unique genes  ,
		{` ${ summary.data.unique_tissue2 }`} unique tissues
		</p>)
    } else {
        return (<div>Loading ... </div>);
    }
    */
    return <div/>;
}

export default Summary
