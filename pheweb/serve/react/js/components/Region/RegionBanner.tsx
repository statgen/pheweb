import React, {useContext} from "react";
import {RegionContext, RegionState} from "./RegionContext";

interface Props {}

const RegionBanner =  (props : Props) => {
    const { region } = useContext<Partial<RegionState>>(RegionContext);
    if(region) {
        const {pheno} = region;

        return (<div className="col-xs-12">
            <h1>{pheno && pheno.phenostring} </h1>
            <p>
                <a href={`https://risteys.finngen.fi/phenocode/${pheno.phenostring}`} target="_blank">RISTEYS</a>
            </p>
        </div>);
    } else {
        return (<div className="col-xs-12"></div>);
    }

}

export default RegionBanner;