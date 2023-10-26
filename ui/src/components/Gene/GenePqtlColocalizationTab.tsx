import React, { useContext } from "react";
import { GeneContext, GeneState } from "./GeneContext";
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs'
import GenePqtls from "./GenePqtlColocalization"
import GeneColocs from "./GeneColocalization"
import 'react-table-v6/react-table.css';

import { ConfigurationWindow } from "../Configuration/configurationModel";

declare let window: ConfigurationWindow;
const { config } = window;
const showPqtl : boolean = config?.userInterface?.gene?.pqtlColocalizations != null;
const showGeneColocs : boolean = config?.userInterface?.gene?.geneColocalizations != null;

const GenePqtlColocsTab = () => {

  const { selectedTab,
          setSelectedTab } = useContext<Partial<GeneState>>(GeneContext);
  
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
            <div id='pqtl table'> <GenePqtls/> </div>
        </TabPanel> }
        { showGeneColocs && <TabPanel>
          <div id='colocalization table'> <GeneColocs/> </div>
        </TabPanel>
        }
    </Tabs>
  </>
}
export default GenePqtlColocsTab




