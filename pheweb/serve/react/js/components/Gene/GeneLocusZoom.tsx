import { mustacheDiv } from "../../common/Utilities";
import React from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";

const default_banner: string = `
<h3>Gene Summary</h3>
`
declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.locusZoom?.banner || default_banner;

interface Props {}
const GeneLocusZoom = (props : Props) => {

  return <div>
    {mustacheDiv(banner, [])}
  </div>
}

export default GeneLocusZoom;