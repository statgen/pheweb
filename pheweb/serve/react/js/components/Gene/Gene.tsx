import React, { useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { fatal, mustacheDiv } from "../../common/Utilities";
import { getMyGene } from "./geneAPI";
import loading from "../../common/Loading";
import { MyGene } from "./geneModel";
import GeneDownload from "./GeneDownload";
import GenePhenotypeAssociation from "./GenePhenotypeAssociation";
import GeneLossOfFunction from "./GeneLossOfFunction";
import GeneFunctionalVariants from "./GeneFunctionalVariants";
import GeneDrugs from "./GeneDrugs";
import GeneLocusZoom from "./GeneLocusZoom";
import GeneContextProvider, { GeneContext } from "./GeneContext";

interface Props {}

const default_banner: string = `
  
  <h3>{{summary.symbol}}</h3>
  <p id="gene-description">{{summary.name}}</p>
  <p id="gene-summary" style="background-color: rgb(244, 244, 244); padding: 10px;">
  {{#summary.entrezgene}}
  [<a href="https://www.ncbi.nlm.nih.gov/gene/{{.}}" target="_blank">NCBI</a>]
  {{/summary.entrezgene}}
  
  {{#summary.summary}}
      {{.}}
  {{/summary.summary}}
  {{^summary.summary}}
  No description
  {{/summary.summary}}
  
  </p>
  <p>
    <span>See gene in</span>
    
    <!-- OMIM -->
    {{#summary.MIM}}
    <span id="omim-link"><a target="_blank" href="https://www.omim.org/entry/{{.}}">OMIM</a></span>
    {{/summary.MIM}}

    {{^summary.MIM}}
    <a target="_blank" href="https://www.omim.org/search/?index=entry&sort=score+desc%2C+prefix_sort+desc&start=1&limit=10&search={{@root.summary.symbol}}">OMIM</a></span>
    {{/summary.MIM}}

    <!-- GTEx -->
    <a target="_blank" href="https://www.gtexportal.org/home/eqtls/byGene?tissueName=All&geneId='{{summary.symbol}}'">GTEx</a>
    
    <!-- gnomAD -->
    {{#summary.ensembl.gene}}
    <a href="http://gnomad.broadinstitute.org/gene/{{.}}" target="_blank">gnomAD</a>
    <a href="https://www.targetvalidation.org/target/{{.}}" target="_blank">Opentarget</a>
    {{/summary.ensembl.gene}}
    
    {{#summary.entrezgene}}
    <a href="https://www.ncbi.nlm.nih.gov/gene/{{.}}" target="_blank">NCBI</a>
    {{/summary.entrezgene}}
    
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

type GeneSummary =  MyGene.Hit

const createSummary = (geneInformation : MyGene.Data | null) => geneInformation?.hits[0]


const Gene = (props : Props) => {
  const gene : string = createGene()
  const [myGeneData, setMyGeneData] = useState<MyGene.Data | null>(null);

  useEffect(() => { getMyGene(gene,setMyGeneData); },[]);

  const summary = createSummary(myGeneData)
  return myGeneData == null ? loading:
  <GeneContextProvider>
    <div>
      { mustacheDiv(banner, { summary }) }
      <GeneDownload gene={gene}/>
      <GenePhenotypeAssociation />
      <GeneLocusZoom />
      <GeneLossOfFunction gene={gene}/>
      <GeneFunctionalVariants gene={gene}/>
      <GeneDrugs gene={gene}/>
    </div>
  </GeneContextProvider>
}

export default Gene;