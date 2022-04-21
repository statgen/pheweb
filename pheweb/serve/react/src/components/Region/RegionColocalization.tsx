import React, { useContext } from "react";
import { RegionContext, RegionState } from "./RegionContext";
import ColocalizationList from "./Colocalization/ColocalizationList";

interface Props {}

const RegionColocalization =  (props : Props) => {
    const { region } = useContext<Partial<RegionState>>(RegionContext);
    if(region) {
        return (<ColocalizationList/>);
    } else {
        return (<div className="col-xs-12"></div>);
    }

}

export default RegionColocalization;