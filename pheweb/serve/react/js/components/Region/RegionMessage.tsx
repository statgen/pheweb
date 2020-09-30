import React, {useContext} from "react";
import {RegionContext, RegionState} from "./RegionContext";

interface Props {}

const RegionMessage =  (props : Props) => {
    const { region } = useContext<Partial<RegionState>>(RegionContext);
    if(region) {
        const {lzConf} = region;

        return (<div className="row">
            <div className="col-xs-12">
                <p>Variants with a p-value smaller {lzConf.p_threshold} than are shown</p>
            </div>
        </div>);
    } else {
        return (<div className="row"></div>);
    }

}

export default RegionMessage;