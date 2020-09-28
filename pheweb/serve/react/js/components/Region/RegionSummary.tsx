import {Phenotype} from "./RegionModel";
import ColocalizationProvider, {
    ColocalizationContext,
    ColocalizationState
} from "./Colocalization/ColocalizationContext";
import Summary from "./Colocalization/ColocalizationSummary";
import React, {useContext} from "react";

interface Props {}
const summary =  (props : Props) => {
    const { searchSummary } = useContext<Partial<ColocalizationState>>(ColocalizationContext);
    if(searchSummary) {
        return (<div className="row">
            <div className="pheno-info col-xs-12">
                <p><b>{pheno.num_cases}</b> cases, <b>{pheno.num_controls}</b> controls</p>
                <p>{pheno.category}</p>
                <ColocalizationProvider><Summary/></ColocalizationProvider>
            </div>
        </div>)
    } else {
        return (<div className="row"/>)
    }
}
