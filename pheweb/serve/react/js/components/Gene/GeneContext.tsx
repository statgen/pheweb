import React, { createContext, useEffect, useState } from "react";
import { GenePhenotypes } from "./geneModel";
import { fatal } from "../../common/Utilities";
import { getGenePhenotypes } from "./geneAPI";

interface Props { children: React.ReactNode }


export interface GeneState {
  readonly selectedPhenotype : GenePhenotypes.Phenotype
  readonly setSelectedPhenotype :  React.Dispatch<React.SetStateAction<GenePhenotypes.Phenotype>>
  readonly genePhenotype : GenePhenotypes.Data
  readonly gene : string
}

export const GeneContext = createContext<Partial<GeneState>>({})

export const createGene = (href : string = window.location.href) : string | never => {
  const match = href.match("\/gene\/(.+)$")
  if(match){
    const [ignore, gene ] : Array<string> = match;
    return gene
  }
  return fatal(`cant parse url ${href}`);
}

const GeneContextProvider = (props : Props) => {
  const gene : string = createGene()
  const [selectedPhenotype, setSelectedPhenotype] = useState<GenePhenotypes.Phenotype| undefined>(undefined);
  const [genePhenotype, setGenePhenotype] = useState<GenePhenotypes.Data| undefined>(undefined);

  useEffect(() => { getGenePhenotypes(gene,setGenePhenotype) },[]);
  useEffect(() => {
    if(genePhenotype != undefined && genePhenotype != null){
      setSelectedPhenotype(genePhenotype.phenotypes[0]);
    }
  },[genePhenotype]);

  return (<GeneContext.Provider value={{ gene , selectedPhenotype , setSelectedPhenotype , genePhenotype }}>
    {props.children}
  </GeneContext.Provider>)
}

export default GeneContextProvider