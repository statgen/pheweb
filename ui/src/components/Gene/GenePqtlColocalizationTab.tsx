import React, { useContext, useEffect, useState } from "react";
import { GeneContext, GeneState } from "./GeneContext";
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs'
import GenePqtls from "./GenePqtlColocalization"
import GeneColocs from "./GeneColocalization"
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { getGenePqtlColocalisations, getGeneColocalisations } from "./geneAPI";
import { PqtlColocalizations, GeneColocalizations } from "./geneModel";
import 'react-table-v6/react-table.css';
import { getCounts } from "../../common/commonTableColumn";


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
  
  var arr = genePqtlColocalizationData?.map(element => { return element['source_displayname'] }).sort();  
  var posBeta = genePqtlColocalizationData?.filter(element =>  element['beta'] > 0).map(element => { return element['source_displayname'] }).sort();
  var negBeta = genePqtlColocalizationData?.filter(element =>  element['beta'] <= 0).map(element => { return element['source_displayname'] }).sort();
  
  var totalCounts = getCounts(arr);
  var pos = getCounts(posBeta);
  var neg = getCounts(negBeta);

  Object.keys(totalCounts).forEach(key => {
    if(!neg.hasOwnProperty(key)) {
      neg[key] = 0;
    }
    if(!pos.hasOwnProperty(key)) {
      pos[key] = 0;
    }
  })

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
          <div>
            <div id='pqtl totals' style={{display: 'flex', flexDirection: 'row', margin: '20px'}} >
              {Object.keys(totalCounts).map((key, i) => 
                <div style={{marginRight: '30px'}} key={key}> 
                  {key}: <b style={{color: '#E54B4B'}}>↑</b>{pos[key]} <b style={{color: '#156064'}}>↓</b>{neg[key]} 
                </div>)}
            </div> 
            <div id='pqtl table'> 
              <GenePqtls 
                genePqtlColocalizationData={genePqtlColocalizationData} 
                error={errorPqtl} 
              /> 
            </div>
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




