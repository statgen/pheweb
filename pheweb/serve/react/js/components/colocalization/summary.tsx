import React, { useState, useEffect , useContext } from 'react';
import { ColocalizationContext, ColocalizationState } from '../../contexts/colocalization/ColocalizationContext';

interface Props {}

const Summary = (props : Props) => {

    const parameter = useContext<Partial<ColocalizationState>>(ColocalizationContext).parameter;
    useEffect( () => {
        getColocalizationSummary();
    }, [parameter]); /* only update on when position is updated */

    const [ summary, setSummary] = useState({
	data : null,
	loading: true
    }); /* set up summary state */

    const getColocalizationSummary = () => {
	if(parameter !== null){
	    const url = `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}/summary?clpa.gte=0.1`;
	    fetch(url).then(response => response.json()).then((d) => { setSummary({  data: d.data, loading: false, }); console.log(d.data); } ).catch(function(error){ alert(error);});
	}
    }

    if(parameter == null) {
        return (<p></p>);
    } else if(summary.data == null){
	return (<div>Loading ... </div>);
    } else {
	return (<p>This region has {` ${ summary.data.count }`} colocalizations ,
		{` ${ summary.data.unique_phenotype2 }`} unique genes  ,
		{` ${ summary.data.unique_tissue2 }`} unique tissues
		</p>)
    }
}

export default Summary