import React, { useState, useEffect , useContext } from 'react';
import { ColocalizationContext } from '../../contexts/colocalization/ColocalizationContext';
import axios from 'axios'


const Summary = (props) => {
    const { position } = useContext(ColocalizationContext);
    useEffect( () => {
        getColocalizationSummary();
    }, [position]); /* only update on when position is updated */

    const [ summary, setSummary] = useState({
	data : null,
	loading: true
    }); /* set up summary state */

    const getColocalizationSummary = () => {
	if(position !== null){
	    const url = `/api/colocalization/${position.phenotype}/${position.chromosome}:${position.start}-${position.stop}/summary?clpa.gte=0.1`;
	    axios.get(url).then((d) => { setSummary({  data: d.data, loading: false, }); console.log(d.data); } ).catch(function(error){ alert(error);});
	}
    }

    if(position == null) {
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

