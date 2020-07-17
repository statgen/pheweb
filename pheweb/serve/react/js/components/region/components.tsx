import React, { createContext, ReactChildren, useState , ReactNode } from 'react';

interface Phenotype {
	  num_cases: number,
	  num_cases_prev: number,
          num_controls: number,
	  phenocode: string,
	  phenostring: string };

interface RegionState { pheno: Phenotype | null ,
                        setPheno : (_ : Phenotype) => void };

const initalRegionState : RegionState = { pheno : null,
                                          setPheno : (_ : Phenotype) => {} };

export const RegionContext = createContext<RegionState>(initalRegionState);

type Props = { children: ReactNode };

const RegionProvider = (props : Props) => {
      const [ pheno, setPheno ] = useState<Phenotype>(null);
      return (<RegionContext.Provider value={ { pheno : null , setPheno } } >{ props.children }</RegionContext.Provider>);
}

export default RegionProvider;