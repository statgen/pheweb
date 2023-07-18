import React, { createContext, useEffect, useState } from "react";
import { CredibleSet, PhenotypeParams, PhenotypeVariantData, QQ } from "./phenotypeModel";
import { Phenotype } from "./../../common/commonModel";
import { getUKBBN, getManhattan, getPhenotype, getCredibleSets, getQQ } from "./phenotypeAPI";

export interface PhenotypeState {
  phenotypeVariantData : PhenotypeVariantData
  UKBBN : Phenotype[]
  phenotype : Phenotype
  credibleSets : CredibleSet[]
  loading : boolean
  errorMessage : string
  phenotypeCode : string
  selectedTab : number
  qq : QQ
  setSelectedTab: React.Dispatch<React.SetStateAction<number>>
}

export const PhenotypeContext = createContext<Partial<PhenotypeState>>({})

interface Props { readonly  children: React.ReactNode ,
                  readonly  params : PhenotypeParams }

const PhenotypeContextProvider = (props : Props) => {
  const phenotypeCode : string = props.params.pheno;
  const [selectedTab, setSelectedTab] = useState<number>(0)
  const [credibleSets, setCredibleSets] = useState<CredibleSet[]|undefined>(undefined)
  const [phenotypeVariantData, setPhenotypeVariantData] = useState<PhenotypeVariantData| undefined>(undefined);
  const [UKBBN, setUKBBN] = useState<Phenotype[]| undefined>(undefined);
  const [phenotype, setPhenotype] = useState<Phenotype| undefined>(undefined);
  const [loading, setLoading] = useState<boolean| undefined>(true);
  const [qq, setQQ] = useState<QQ| undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string| undefined>(undefined);

  useEffect(() => {
    getManhattan(phenotypeCode,setPhenotypeVariantData);
    getUKBBN(phenotypeCode,setUKBBN);
    getPhenotype(phenotypeCode, setPhenotype, setErrorMessage);
    getCredibleSets(phenotypeCode, setCredibleSets);
    getQQ(phenotypeCode, setQQ);
  },[setPhenotypeVariantData, setUKBBN, setPhenotype, phenotypeCode]);

  useEffect(() => {
    setLoading(phenotype=== undefined);
  },[phenotype, setPhenotype, setLoading]);

 return (
<PhenotypeContext.Provider value={{
  phenotypeCode,
  phenotypeVariantData ,
  UKBBN ,
  phenotype ,
  loading ,
  selectedTab,
  setSelectedTab,
  credibleSets,
  qq,
  errorMessage
}}>
  {props.children}
</PhenotypeContext.Provider>);
}

export default PhenotypeContextProvider
