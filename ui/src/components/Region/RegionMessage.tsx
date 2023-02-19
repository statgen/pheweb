import React, { useContext } from "react";
import { RegionContext, RegionState } from "./RegionContext";

interface Props {}

const RegionMessage =  (props : Props) => {
    const { region } = useContext<Partial<RegionState>>(RegionContext);
    if(region?.lz_conf) {
        const {lz_conf} = region;
        return (<div className="row">
                    <div className="col-xs-12">
                        <p>Variants with a p-value smaller {lz_conf.p_threshold} than are shown</p>
                    </div>
                </div>);
    } else {
        return (<div className="row"></div>);
    }

}

export default RegionMessage;