import React, { useContext } from "react";
import GeneDownload from "./GeneDownload";
import GenePhenotypeAssociation from "./GenePhenotypeAssociation";
import GeneLossOfFunction from "./GeneLossOfFunction";
import GeneFunctionalVariants from "./GeneFunctionalVariants";
import GeneDrugs from "./GeneDrugs";
import GeneLocusZoom from "./GeneLocusZoom";
import GeneContextProvider, { GeneContext, GeneState } from "./GeneContext";
import GeneBanner from "./GeneBanner";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { GeneParams } from "./geneModel";
import { RouteComponentProps } from "react-router-dom";
import { hasError, isLoading } from "../../common/CommonLoading";

declare let window: ConfigurationWindow;
const { config } = window;
const showLOF : boolean = config?.userInterface?.gene?.lossOfFunction != null;

type Props = RouteComponentProps<GeneParams>;

const GeneContent = () => {
  const { genePhenotype, errorMessage } = useContext<Partial<GeneState>>(GeneContext);

  const content = () => <div>
    <GeneBanner/>
    <GeneDownload/>
    <GenePhenotypeAssociation />
    <GeneLocusZoom />
    { showLOF && <GeneLossOfFunction/> }
    <GeneFunctionalVariants/>
    <GeneDrugs/>
  </div>

  return hasError(errorMessage, isLoading(genePhenotype === null || genePhenotype === undefined, content));
}

const Gene = (props : Props) =>
  <GeneContextProvider params={props.match.params}>
    <GeneContent/>
  </GeneContextProvider>

export default Gene;
