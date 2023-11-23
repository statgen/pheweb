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
import { GeneParams, Gene as GeneModel } from "./geneModel";
import { RouteComponentProps } from "react-router-dom";
import { hasError, isLoading } from "../../common/CommonLoading";

declare let window: ConfigurationWindow;
const { config } = window;
const showLOF : boolean = config?.userInterface?.gene?.lossOfFunction != null;
const showPqtl : boolean = config?.userInterface?.gene?.pqtlColocalizations != null;

const titles : GeneModel.TableOfContentsTitlesConfiguration = config?.userInterface?.gene?.tableOfContentsTitles || null;

type Props = RouteComponentProps<GeneParams>;

const GeneContent = () => {

  const { genePhenotype, errorMessage } = useContext<Partial<GeneState>>(GeneContext);

  var tableOfContents = null;
  var keys = {};
  if (titles !== null) {
    tableOfContents = Object.keys(titles).map( (el, index) => {
      var key = "#" + titles[el].toLowerCase().split(' ').join('-');
      return (
        <div key={index} className="list-item-container">
            <div  className="list-item-box">{index + 1}</div>
            <a href={key}>{titles[el]}</a>
        </div>
      )
    })

    Object.keys(titles).forEach( (el) => { 
      keys[el] = titles[el].toLowerCase().split(' ').join('-')
    });

  }

  const content = () => <div className="gene-page-container">
    <GeneBanner/>
    <GeneDownload/>
    {
      titles ? (
        <div>
          <h3>Contents</h3> 
          <div className="gene-content-container">      
            { titles && <div className="vl"></div> }
            {tableOfContents}
          </div>  
        </div>
      ) : null
    }
    <div id={titles ? keys['associationResults'] : null}>
      <GenePhenotypeAssociation/>
      <GeneLocusZoom />
    </div>
    <div id={titles ? keys['geneFunctionalVariants'] : null}>
      <GeneFunctionalVariants/>
    </div>
    { showLOF && <div id={titles ? keys['lossOfFunction'] : null}><GeneLossOfFunction/></div>}
    { showPqtl && <div id={titles ? keys['pqtlColocalizations'] : null}><GenePqtls/></div> }
    <div id={titles ? keys['geneDrugs'] : null}><GeneDrugs/></div>

  </div>

  return hasError(errorMessage, isLoading(genePhenotype === null || genePhenotype === undefined, content));
}

const Gene = (props : Props) =>
  <GeneContextProvider params={props.match.params}>
    <GeneContent/>
  </GeneContextProvider>

export default Gene;
