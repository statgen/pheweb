import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route } from 'react-router-dom'
import Index from './components/Index'
import LoF from './components/LoF'
import Chip from './components/Chip'
import Coding from './components/Coding'
import Variant from './components/Variant'
import Pheno from './components/Pheno'
import Region from './components/Region/RegionIndex'
import ConfigurationContextProvider from "./components/Region/RegionContext";

var element = document.getElementById('reactEntry')
if (typeof (element) !== 'undefined' && element != null) {
    ReactDOM.render(
	<ConfigurationContextProvider>
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, height: '100%', padding: '10px', display: 'flex', flexFlow: 'row nowrap', justifyContent: 'flex-start' }}>
          <Route exact path='/' component={Index} />
          <Route exact path='/lof' component={LoF} />
          <Route exact path='/chip' component={Chip} />
          <Route exact path='/coding' component={Coding} />
          <Route path='/variant/:variant' component={Variant} />
          <Route path='/pheno/:pheno' component={Pheno} />
          <Route path='/region/:region' component={Region} />
        </div>
      </div>
	    </BrowserRouter>
	</ConfigurationContextProvider>	    
    , document.getElementById('reactEntry'))
}
