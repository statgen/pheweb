import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route } from 'react-router-dom'
import NotFound from './components/NotFound/NotFound'
import Index from './components/Index/Index'
import LoF from './components/LoF'
import Chip from './components/Chip/ChipIndex'
import Coding from './components/Coding'
import Variant from './components/Variant'
import Pheno from './components/Pheno'
import Region from './components/Region/RegionIndex'

const element = document.getElementById('reactEntry')
if (typeof (element) !== 'undefined' && element != null) {
    ReactDOM.render(
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, height: '100%', padding: '10px', display: 'flex', flexFlow: 'row nowrap', justifyContent: 'flex-start' }}>
          <Route exact path='/' component={Index} />
          <Route exact path='/notfound' component={NotFound} />
          <Route exact path='/lof' component={LoF} />
          <Route exact path='/chip' component={Chip} />
          <Route exact path='/coding' component={Coding} />
          <Route path='/variant/:variant' component={Variant} />
          <Route path='/pheno/:pheno' component={Pheno} />
          <Route path='/region/:region' component={Region} />
        </div>
      </div>
	</BrowserRouter>
    , document.getElementById('reactEntry'))
}
