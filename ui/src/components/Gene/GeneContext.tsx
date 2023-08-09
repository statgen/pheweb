import React, { createContext, useEffect, useState } from "react";
import { GeneParams, GenePhenotypes } from "./geneModel";
import { getGenePhenotypes } from "./geneAPI";

interface Props {
  readonly  children: React.ReactNode
  readonly  params : GeneParams
}

interface Parameter {
  readonly phenotype : string | null
  readonly gene : string
}

export interface GeneState {
  readonly gene : string
  readonly genePhenotype : GenePhenotypes.Data
  readonly selectedPhenotype : GenePhenotypes.Phenotype
  readonly errorMessage : string
}

export const GeneContext = createContext<Partial<GeneState>>({})

const GeneContextProvider = ({ params : { gene , phenotype }, children } : Props) => {
  const [genePhenotype, setGenePhenotype] = useState<GenePhenotypes.Data| undefined>(undefined);
  const [selectedPhenotype, setSelectedPhenotype] = useState<GenePhenotypes.Phenotype| undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string| undefined>(undefined);

  useEffect(() => { getGenePhenotypes(gene,setGenePhenotype, setErrorMessage) },[gene, setGenePhenotype]);
  useEffect(() => {
    if(genePhenotype){
      const search = genePhenotype.phenotypes.find(p => p.pheno.phenocode === phenotype)
      if(search === undefined && genePhenotype.phenotypes.length > 0){
        setSelectedPhenotype(genePhenotype.phenotypes[0]);
      } else {
        setSelectedPhenotype(search);
      }
    }
  },[genePhenotype, phenotype]);

  return (<GeneContext.Provider value={{ gene,
                                         selectedPhenotype ,
                                         genePhenotype ,
                                         errorMessage }}>
    { children }
  </GeneContext.Provider>)
}

export default GeneContextProvider
