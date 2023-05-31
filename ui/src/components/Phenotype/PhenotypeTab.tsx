import React, { useContext } from "react";
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs'
import { PhenotypeContext, PhenotypeState } from "./PhenotypeContext";
import VariantTable from './PhenotypeVariantTable';
import PhenotypeCSTable from "./PhenotypeCSTable";

const PhenotypeTab = () => {
  const { phenotypeCode ,
          credibleSets ,
          selectedTab,
          setSelectedTab } = useContext<Partial<PhenotypeState>>(PhenotypeContext);

  return <>
    <h3>Lead variants</h3>
    <Tabs
      forceRenderTabPanel
      selectedIndex={selectedTab}
      onSelect={setSelectedTab}
      style={{ width: '100%' }}
    >
      <TabList>
        { credibleSets && <Tab>Credible Sets</Tab> }
        <Tab>Traditional</Tab>
      </TabList>
      { credibleSets && <TabPanel>
        <div id='cs table' className='phenotype-tab'>
          <PhenotypeCSTable/>
        </div>
      </TabPanel> }
      <TabPanel>
        <div id='traditional table' className='phenotype-tab'>
          <VariantTable/>
        </div>
      </TabPanel>
    </Tabs>
  </>
}
export default PhenotypeTab
