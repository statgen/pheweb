import React, { createContext, useEffect, useState } from "react";
import { GenePhenotypes } from "./geneModel";
import { fatal } from "../../common/Utilities";
import { getGenePhenotypes } from "./geneAPI";

interface Props { children: React.ReactNode }

interface Parameter {
  readonly phenotype : string | null
  readonly gene : string
}

export interface GeneState {
  readonly gene : string
  readonly genePhenotype : GenePhenotypes.Data
  readonly selectedPhenotype : GenePhenotypes.Phenotype
}

export const GeneContext = createContext<Partial<GeneState>>({})


export const createParameter = (href : string = window.location.href, fail = fatal) : Parameter | never => {
  const match = href.match("/gene/([^/]+)(/pheno/([^/]+))?$")
  if(match != null) {
    const [/* ignore_1 */ , gene, /* ignore_2 */ , phenotype,] = match
    return { gene , phenotype }
  }
  return fatal(`cant parse url ${href}`);
}

const GeneContextProvider = (props : Props) => {
  const parameter : Parameter = createParameter()
  const [genePhenotype, setGenePhenotype] = useState<GenePhenotypes.Data| undefined>(undefined);
  const [selectedPhenotype, setSelectedPhenotype] = useState<GenePhenotypes.Phenotype| undefined>(undefined);

  useEffect(() => { getGenePhenotypes(parameter.gene,setGenePhenotype) },[parameter.gene, setGenePhenotype]);
  useEffect(() => {
    if(genePhenotype){
      const search = genePhenotype.phenotypes.find(p => p.pheno.phenocode === parameter.phenotype)
      if(search === undefined && genePhenotype.phenotypes.length > 0){
        setSelectedPhenotype(genePhenotype.phenotypes[0]);
      } else {
        setSelectedPhenotype(search);
      }
    }
  },[genePhenotype, parameter.phenotype]);
  return (<GeneContext.Provider value={{ gene : parameter.gene,  selectedPhenotype , genePhenotype }}>
    {props.children}
  </GeneContext.Provider>)
}

export default GeneContextProvider