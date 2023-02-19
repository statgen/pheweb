import React, { useContext } from "react";
import { ColocalizationContext, ColocalizationState } from "./ColocalizationContext";

interface Prop {}

const ColocalizationSummary = (prop : Prop) => {
    const { searchSummary } = useContext<Partial<ColocalizationState>>(ColocalizationContext);
    if(searchSummary) {
        return (<p>
                This region has {` ${ searchSummary.count }`} colocalizations ,
                                {` ${ searchSummary.unique_phenotype2 }`} unique genes  ,
                                {` ${ searchSummary.unique_tissue2 }`} unique tissues
                </p>)
    } else {
        return (<div>Loading ... </div>);
    }
}

export default ColocalizationSummary
