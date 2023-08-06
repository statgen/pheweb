import React from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";

interface Props {}

declare let window: ConfigurationWindow;
const config = window?.config?.userInterface?.region;
const p_threshold = config?.lz_configuration?.p_threshold;

const RegionMessage =  (props : Props) => {
    if(p_threshold) {
        return (<div className="row">
                    <div className="col-xs-12">
                        <p>Variants with a p-value smaller {p_threshold} than are shown</p>
                    </div>
                </div>);
    } else {
        return (<div className="row"></div>);
    }

}

export default RegionMessage;