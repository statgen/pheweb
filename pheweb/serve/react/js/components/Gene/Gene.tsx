import React, { useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { fatal, mustacheDiv } from "../../common/Utilities";
import GenePhenotype from "./GenePhenotype";
import GeneLocusZoom from "./GeneLocusZoom";
import GeneLOF from "./GeneLOF";
import GeneDrugs from "./GeneDrugs";
import { getMyGeneInformation } from "./geneAPI";
import { MyGeneInformation, MyGeneInformationHit } from "./geneModel";
import loading from "../../common/Loading";
import GeneFunctionalVariant from "./GeneFunctionalVariant";

interface Props {}

const default_banner: string = `
  
  <h3>{{symbol}}</h3>
  <p id="gene-description">{{name}}</p>
  <p id="gene-summary" style="background-color: rgb(244, 244, 244); padding: 10px;">
  {{#entrezgene}}
  [<a href="https://www.ncbi.nlm.nih.gov/gene/{{.}}" target="_blank">NCBI</a>]
  {{/entrezgene}}
  
  {{#summary}}
      {{.}}
  {{/summary}}
  {{^summary}}
  No description
  {{/summary}}
  
  </p>
  
  
  
`
declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.banner || default_banner;

export const createGene = (href : string = window.location.href) : string | never => {
  const match = href.match("\/gene\/(.+)$")
  if(match){
    const [ignore, gene ] : Array<string> = match;
    return gene
  }
  return fatal(`cant parse url ${href}`);
}

type GeneSummary =  MyGeneInformationHit

const createSummary = (geneInformation : MyGeneInformation | null) => {
  return { ... geneInformation?.hits[0] }
}

const Gene = (props : Props) => {
  const gene : string = createGene()
  const [geneInformation, setGeneInformation] = useState<MyGeneInformation | null>(null);

  useEffect(() => { getMyGeneInformation(gene,setGeneInformation); },[]);

  const context = createSummary(geneInformation)
  return geneInformation == null ? loading: <div>
    { mustacheDiv(banner, context) }
    <GeneLocusZoom/>
    <GeneLOF gene={gene}/>
    <GeneFunctionalVariant gene={gene}/>
    <GeneDrugs gene={gene}/>
  </div>
}

export default Gene;