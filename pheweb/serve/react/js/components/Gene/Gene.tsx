import React from "react";
import GeneDownload from "./GeneDownload";
import GenePhenotypeAssociation from "./GenePhenotypeAssociation";
import GeneLossOfFunction from "./GeneLossOfFunction";
import GeneFunctionalVariants from "./GeneFunctionalVariants";
import GeneDrugs from "./GeneDrugs";
import GeneLocusZoom from "./GeneLocusZoom";
import GeneContextProvider, { GeneContext } from "./GeneContext";
import GeneBanner from "./GeneBanner";

interface Props {}

const Gene = (props : Props) =>
  <GeneContextProvider>
    <div>
      <GeneBanner/>
      <GeneDownload/>
      <GenePhenotypeAssociation />
      <GeneLocusZoom />
      <GeneLossOfFunction/>
      <GeneFunctionalVariants/>
      <GeneDrugs/>
    </div>
  </GeneContextProvider>

export default Gene;