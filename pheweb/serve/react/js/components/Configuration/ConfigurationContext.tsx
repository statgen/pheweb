import React, { createContext,  useState , useEffect } from 'react';

interface Props { children: React.ReactNode }

export interface ConfigurationUI {}
export interface ConfigurationMetaData {}

export interface ConfigurationState {
       userInterface : ConfigurationUserInterface ;
       metaData : ConfigurationMetaData ;
}

export const ConfigurationContext = createContext<Partial<ColocalizationState>>({});

const ConfigurationContextProvider = (props : Props) => {
      const [ userInterface , setUserInterface ] = useState<ConfigurationUI|undefined>(undefined);
      const [ metadata , setMetadata ] = useState<ConfigurationMetaData|undefined>(undefined);

      useEffect(() => { getRegion(parameter,setRegion); },[]);

      return (<ConfigurationContext.Provider value={{ ui , metadata }}>
              {props.children}
	      </ConfigurationContext.Provider>);
}