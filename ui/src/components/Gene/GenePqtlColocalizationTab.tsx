import React, { useContext, useEffect, useState } from "react";
import { GeneContext, GeneState } from "./GeneContext";
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs'
import GenePqtls from "./GenePqtlColocalization"
import GeneColocs from "./GeneColocalization"
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { getGenePqtlColocalisations, getGeneColocalisations } from "./geneAPI";
import { PqtlColocalizations, GeneColocalizations } from "./geneModel";
import 'react-table-v6/react-table.css';

declare let window: ConfigurationWindow;
const { config } = window;
const showPqtl : boolean = config?.userInterface?.gene?.pqtlColocalizations != null;
const showGeneColocs : boolean = config?.userInterface?.gene?.geneColocalizations != null;

const GenePqtlColocsTab = () => {

  const { gene } = useContext<Partial<GeneState>>(GeneContext);

  const [errorPqtl, setErrorPqtl] = useState<string|null>(null);
  const [genePqtlColocalizationData, setGenePqtlColocalizationData] = useState<PqtlColocalizations.Data | null>(null);
  useEffect(() => { getGenePqtlColocalisations(gene, setGenePqtlColocalizationData, setErrorPqtl) },[gene]);

  const [errorColoc, setErrorColoc] = useState<string|null>(null);
  const [geneColocalizationData, setGeneColocalizationData] = useState<GeneColocalizations.Data | null>(null);
  useEffect(() => { getGeneColocalisations(gene, setGeneColocalizationData, setErrorColoc) },[gene]);

  const { selectedTab, setSelectedTab } = useContext<Partial<GeneState>>(GeneContext);
  
  return <>
    <h3>pQTL and disease colocalizations</h3>
    <Tabs
      selectedIndex={selectedTab}
      onSelect={setSelectedTab}
      style={{ width: '100%' }}
    >
      <TabList>
        { showPqtl && <Tab>pQTL</Tab> }
        { showGeneColocs && <Tab>Phenotype</Tab> }
      </TabList>
        { showPqtl && <TabPanel>
            <div id='pqtl table'> 
              <GenePqtls 
                genePqtlColocalizationData={genePqtlColocalizationData} 
                error={errorPqtl} 
              /> 
            </div>
        </TabPanel> }
        { showGeneColocs && <TabPanel>
          <div id='colocalization table'> 
            <GeneColocs
              geneColocalizationData={geneColocalizationData} 
              error={errorColoc} 
              />
            </div>
        </TabPanel>
        }
    </Tabs>
  </>
}
export default GenePqtlColocsTab




