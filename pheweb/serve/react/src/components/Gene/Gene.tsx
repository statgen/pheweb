import React from "react";
import GeneDownload from "./GeneDownload";
import GenePhenotypeAssociation from "./GenePhenotypeAssociation";
import GeneLossOfFunction from "./GeneLossOfFunction";
import GeneFunctionalVariants from "./GeneFunctionalVariants";
import GeneDrugs from "./GeneDrugs";
import GeneLocusZoom from "./GeneLocusZoom";
import GeneContextProvider from "./GeneContext";
import GeneBanner from "./GeneBanner";
import { ConfigurationWindow } from "../Configuration/configurationModel";

interface Props {}
declare let window: ConfigurationWindow;
const { config } = window;
const hideLOF : boolean = config?.userInterface?.gene?.lossOfFunction == null;

const Gene = (props : Props) =>
  <GeneContextProvider>
    <div>
      <GeneBanner/>
      <GeneDownload/>
      <GenePhenotypeAssociation />
      <GeneLocusZoom />
      { hideLOF && <GeneLossOfFunction/> }
      <GeneFunctionalVariants/>
      <GeneDrugs/>
    </div>
  </GeneContextProvider>

export default Gene;