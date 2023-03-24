import React, { useContext } from "react";
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs'
import { PhenotypeContext, PhenotypeState } from "./PhenotypeContext";
import VariantTable from './PhenotypeVariantTable';
import PhenotypeCSTable from "./PhetotypeCSTable";

const PhenotypeTab = () => {
  const { phenotypeCode ,
          selectedTab,
          setSelectedTab } = useContext<Partial<PhenotypeState>>(PhenotypeContext);

  const variantTable = <VariantTable phenotypeCode={phenotypeCode} />
  const csTable = <PhenotypeCSTable/>

  return <>
    <h3>Lead variants</h3>
    <Tabs
      forceRenderTabPanel
      selectedIndex={selectedTab}
      onSelect={setSelectedTab}
      style={{ width: '100%' }}
    >
      <TabList>
        <Tab>Credible Sets</Tab>
        <Tab>Traditional</Tab>
      </TabList>
      <TabPanel>
        <div id='cs table' className='phenotype-tab'>
          {csTable}
        </div>
      </TabPanel>
      <TabPanel>
        <div id='traditional table' className='phenotype-tab'>
          {variantTable}
        </div>
      </TabPanel>
    </Tabs>
  </>
}
export default PhenotypeTab
