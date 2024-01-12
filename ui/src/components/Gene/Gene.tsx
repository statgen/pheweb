import React, { useContext, useEffect, useState } from "react";
import GeneDownload from "./GeneDownload";
import GenePhenotypeAssociation from "./GenePhenotypeAssociation";
import GeneLossOfFunction from "./GeneLossOfFunction";
import GeneFunctionalVariants from "./GeneFunctionalVariants";
import GeneDrugs from "./GeneDrugs";
import GeneLocusZoom from "./GeneLocusZoom";
import GeneContextProvider, { GeneContext, GeneState } from "./GeneContext";
import GeneBanner from "./GeneBanner";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { GeneParams, Gene as GeneModel } from "./geneModel";
import { RouteComponentProps } from "react-router-dom";
import { hasError, isLoading } from "../../common/CommonLoading";
import GenePqtlColocsTab from "./GenePqtlColocalizationTab";

declare let window: ConfigurationWindow;
const { config } = window;
const showLOF : boolean = config?.userInterface?.gene?.lossOfFunction != null;
const showPqtl : boolean = config?.userInterface?.gene?.pqtlColocalizations != null;
const showGeneColocs : boolean = config?.userInterface?.gene?.geneColocalizations != null;
const showTableOfContents : boolean = config?.userInterface?.gene?.tableOfContentsTitles != null;
const tableOfContentsTitles : GeneModel.TableOfContentsTitlesConfiguration = config?.userInterface?.gene?.tableOfContentsTitles || null;

type Props = RouteComponentProps<GeneParams>;

const GeneContent = () => {

  const { genePhenotype, errorMessage } = useContext<Partial<GeneState>>(GeneContext);

  var tableOfContents = null;
  var tableOfContentsComponentIds = {};
  if (showTableOfContents) {
    tableOfContents = Object.keys(tableOfContentsTitles).map( (el, index) => {
      return (
        <div key={index} className="list-item-container">
            <div  className="list-item-box">{index + 1}</div>
            <a href={"#" + tableOfContentsTitles[el].toLowerCase().split(' ').join('-')}>{tableOfContentsTitles[el]}</a>
        </div>
      )
    })

    Object.keys(tableOfContentsTitles).forEach( (el) => { 
      tableOfContentsComponentIds[el] = tableOfContentsTitles[el].toLowerCase().split(' ').join('-')
    });

  }

  const content = () => <div className="gene-page-container">
    <GeneBanner/>
    <GeneDownload/>
    {
      showTableOfContents ? (
        <div>
          <h3>Contents</h3> 
          <div className="gene-content-container">      
            { showTableOfContents && <div className="vl"></div> }
            {tableOfContents}
          </div>  
        </div>
      ) : null
    }
    <div id={showTableOfContents ? tableOfContentsComponentIds['associationResults'] : null}>
      <GenePhenotypeAssociation/>
      <GeneLocusZoom />
    </div>
    <div id={showTableOfContents ? tableOfContentsComponentIds['geneFunctionalVariants'] : null}>
      <GeneFunctionalVariants/>
    </div>
    { showLOF && <div id={showTableOfContents ? tableOfContentsComponentIds['lossOfFunction'] : null}><GeneLossOfFunction/></div>}
    { (showPqtl || showGeneColocs) && <div id={showTableOfContents ? tableOfContentsComponentIds['pqtlColocalizations'] : null}><GenePqtlColocsTab/></div> }
    <div id={showTableOfContents ? tableOfContentsComponentIds['geneDrugs'] : null}><GeneDrugs/></div>

  </div>

  return hasError(errorMessage, isLoading(genePhenotype === null || genePhenotype === undefined, content));
}

const Gene = (props : Props) =>
  <GeneContextProvider params={props.match.params}>
    <GeneContent/>
  </GeneContextProvider>

export default Gene;
