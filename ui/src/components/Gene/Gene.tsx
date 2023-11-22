import React, { useContext, useEffect, useState } from "react";
import GeneDownload from "./GeneDownload";
import GenePhenotypeAssociation from "./GenePhenotypeAssociation";
import GeneLossOfFunction from "./GeneLossOfFunction";
import GeneFunctionalVariants from "./GeneFunctionalVariants";
import GeneDrugs from "./GeneDrugs";
import GeneLocusZoom from "./GeneLocusZoom";
import GeneContextProvider, { GeneContext, GeneState } from "./GeneContext";
import GeneBanner from "./GeneBanner";
import GenePqtls from "./GenePqtlColocalization"
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { GeneParams } from "./geneModel";
import { RouteComponentProps } from "react-router-dom";
import { hasError, isLoading } from "../../common/CommonLoading";

declare let window: ConfigurationWindow;
const { config } = window;
const showLOF : boolean = config?.userInterface?.gene?.lossOfFunction != null;
const showPqtl : boolean = config?.userInterface?.gene?.pqtlColocalizations != null;

type Props = RouteComponentProps<GeneParams>;

const GeneContent = () => {

  const { genePhenotype, errorMessage } = useContext<Partial<GeneState>>(GeneContext);

  const content = () => <div className="gene-page-container">
    <GeneBanner/>
    <GeneDownload/>
    <h3>Contents</h3>
    <nav>
      <ol>
          <li><a href="#disease-associations-within-gene-region">Disease associations within gene region</a></li>
          <li><a href="#coding-variant-associations">Coding variant associations</a></li>
          { showLOF && <li><a href="#protein-truncating-variant-burden-associations">Protein truncating variant burden associations</a></li> }
          { showPqtl && <li><a href="#pqtl-and-colocalizations">pQTL and colocalizations</a></li> }
          <li><a href="#drugs-targeting-the-gene">Drugs targeting the gene</a></li>
      </ol>
    </nav>
    <div id="disease-associations-within-gene-region">
      <GenePhenotypeAssociation/>
      <GeneLocusZoom />
    </div>
    <div id="coding-variant-associations"><GeneFunctionalVariants/></div>
    { showLOF && <div id="protein-truncating-variant-burden-associations"><GeneLossOfFunction/></div>}
    { showPqtl && <div id="pqtl-and-colocalizations"><GenePqtls/></div> }
    <div id="drugs-targeting-the-gene"><GeneDrugs/></div>
  </div>

  return hasError(errorMessage, isLoading(genePhenotype === null || genePhenotype === undefined, content));
}

const Gene = (props : Props) =>
  <GeneContextProvider params={props.match.params}>
    <GeneContent/>
  </GeneContextProvider>

export default Gene;
