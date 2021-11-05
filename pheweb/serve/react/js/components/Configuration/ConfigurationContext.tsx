import React, { createContext,  useState , useEffect } from "react";
import {ConfigurationMetaData, ConfigurationState, ConfigurationUserInterface} from "./ConfigurationModel";
import {getConfigurationMetaData, getConfigurationUserInterface} from "./ConfigurationAPI";

interface Props { children: React.ReactNode }

export const ConfigurationContext = createContext<Partial<ConfigurationState>>({});


const ConfigurationContextProvider = (props : Props) => {
      const [ userInterface , setUserInterface ] = useState<ConfigurationUserInterface|undefined>(undefined);
      const [ metaData , setMetadata ] = useState<ConfigurationMetaData|undefined>(undefined);

      useEffect(() => { getConfigurationUserInterface(setUserInterface); },[]);
      useEffect(() => { getConfigurationMetaData(setMetadata); },[]);

      return (<ConfigurationContext.Provider value={{ userInterface , metaData }}>
              {props.children}
	      </ConfigurationContext.Provider>);
}