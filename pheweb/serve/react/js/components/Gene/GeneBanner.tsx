import React, { useContext, useEffect, useState } from "react";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { mustacheDiv } from "../../common/Utilities";
import { MyGene } from "./geneModel";
import { getMyGene } from "./geneAPI";
import { GeneContext, GeneState } from "./GeneContext";
import loading from "../../common/Loading";

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
type GeneSummary =  MyGene.Hit

const createSummary = (geneInformation : MyGene.Data | null) => geneInformation?.hits[0]

declare let window: ConfigurationWindow;
const { config } = window;
const banner: string = config?.userInterface?.gene?.banner || default_banner;


interface Props {}
const GeneBanner = (props : Props) => {
  const { gene } = useContext<Partial<GeneState>>(GeneContext);
  const [myGeneData, setMyGeneData] = useState<MyGene.Data | null>(null);
  useEffect(() => { getMyGene(gene,setMyGeneData); },[]);

  if(myGeneData == null){
    return loading
  } else {
    const summary = createSummary(myGeneData)
    return mustacheDiv(banner, { summary })
  }
}

export default GeneBanner
