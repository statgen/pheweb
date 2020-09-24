import React , { useState, useEffect , useContext } from 'react'
import { Link } from 'react-router-dom'
//import RegionProvider from './components'
interface Props {};
import { VisConf , LzConf, Phenotype, Region } from './components';
import Summary from '../colocalization/ColocalizationSummary'
import List from '../colocalization/ColocalizationList'
import { init_locus_zoom, LocusZoomContext } from './locus'
import ColocalizationProvider from '../colocalization/ColocalizationContext'
import styles from './region.css'

const banner = (pheno : Phenotype) => <div className="w-100 row">
    <div className="col-xs-12">
    <h1>{ pheno && pheno.phenostring } </h1>
    <p>
       <a href={ `https://risteys.finngen.fi/phenocode/${pheno.phenostring}`} target="_blank">RISTEYS</a>
    </p>

     </div>
 </div>

const summary =  (pheno : Phenotype) => <div className="row">
    <div className="pheno-info col-xs-12">
    <p><b>{ pheno.num_cases }</b> cases, <b>{ pheno.num_controls }</b> controls</p>
    <p>{pheno.category}</p>
    <ColocalizationProvider><Summary /></ColocalizationProvider>
    </div>
 </div>

const message = (lzConf : LzConf) => <div className="row">
    <div className="col-xs-12">
    <p>Variants with a p-value smaller {lzConf.p_threshold} than are shown</p>
    </div>
 </div>

const locus_zoom = (region : string) => <div className="row">
    <div className="col-xs-12">
    <div id="lz-1" className="lz-locuszoom-container lz-container-responsive" data-region={ region }></div>
  </div>
</div>


const colocalization = (locusZoomContext : LocusZoomContext | undefined) => <div className="row">
  <div className="col-xs-12" id="colocalization_list_div">
    <ColocalizationProvider><List locusZoomContext={locusZoomContext} /></ColocalizationProvider>
  </div>
</div>
    
const Region = (props : Props) => {
    const [ region, setRegion ] = useState<Region | undefined>(undefined);
    const [ locusZoomContext, setLocusZoomContext] = useState<LocusZoomContext | undefined>(undefined);
    
    const updatePheno = () => {
        const summary_url : string = `/api${window.location.pathname}`;
	fetch(summary_url).
	    then(res => res.json()).
	    then(res => { setRegion(res); });
    };
    const updateLocusZoom = () => {
	if(region){
	    setLocusZoomContext(init_locus_zoom(region));
	}
    };
    

    useEffect(() => {updatePheno(); },[]);
    useEffect(() => {updateLocusZoom(); },[region]);
    return <div className="container-fluid"  style={{ width : "95%"}}>
	{ region?banner(region.pheno):<div></div> }
        { /* region?summary(region.pheno): */ <div></div> }
        { /* region?message(region.lz_conf) :*/<div></div> }
        { region?locus_zoom(region.region):<div></div> }
        { colocalization(locusZoomContext) }
    </div>;
}

export default Region;
