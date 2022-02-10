import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route } from 'react-router-dom'
import NotFound from './components/NotFound/NotFound'
import Index from './components/Index/Index'
import LoF from './components/LOF/LOF'
import Chip from './components/Chip/ChipIndex'
import Coding from './components/Coding/Coding'
import Variant from './components/Variant/Variant'
import Pheno from './components/Pheno'
import Region from './components/Region/RegionIndex'
import About from './components/About/About'
import Gene from './components/Gene/Gene'
import TopHits from './components/TopHits/TopsHits'
import 'react-table/react-table.css'
import 'react-tabs/style/react-tabs.css'
import './assets/common.css'
import './assets/react-style.css'
import 'locuszoom/dist/locuszoom.css'

import Nav from './Nav'

const element = document.getElementById('root')
if (typeof (element) !== 'undefined' && element != null) {
    ReactDOM.render(
    <BrowserRouter>
      <Nav/>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, height: '100%', padding: '10px', display: 'flex', flexFlow: 'column nowrap', justifyContent: 'flex-start' }}>
          <Route exact path='/' component={Index} />
          <Route exact path='/notfound' component={NotFound} />
          <Route exact path='/lof' component={LoF} />
          <Route exact path='/chip' component={Chip} />
          <Route exact path='/coding' component={Coding} />
          <Route path='/variant/:variant' component={Variant} />
          <Route path='/pheno/:pheno' component={Pheno} />
          <Route path='/region/:region' component={Region} />

          <Route path='/about' component={About} />
          <Route path='/gene/:gene' component={Gene} />
          <Route path='/gene/:gene/pheno/:pheno' component={Gene} />
          <Route path='/top_hits' component={TopHits} />
        </div>
      </div>
	</BrowserRouter>
  , document.getElementById('root'))
}
