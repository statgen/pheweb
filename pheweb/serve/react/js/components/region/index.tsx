import React , { useState, useEffect , useContext } from 'react'
import { Link } from 'react-router-dom'
import RegionProvider from './components'
interface Props {};
import { RegionContext } from './components';


const Region = (props : Props) => {
    const { pheno } = useContext(RegionContext);

    const updatePheno = () => {
         const summary_url : string = `/api${window.location.pathname}`;
	 fetch(summary_url).then(res => res.json<RegionState>()).then(res => setPheno(res));
    };
    useEffect(() => {updatePheno(); });

    return (<RegionProvider>
    	    <div className="row">
                 <div className="col-xs-12">
                 <h1>{ pheno? "a" : "b" }</h1>
                 </div>
            </div>
	   </RegionProvider>);
}

export default Region;
