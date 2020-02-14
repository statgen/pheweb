import React from 'react'
import ReactDOM from 'react-dom'
import {
    BrowserRouter,
    Route,
    Switch,
    withRouter
} from 'react-router-dom'
import Index from './components/Index'
import Coding from './components/Coding'
import Variant from './components/Variant'
import Pheno from './components/Pheno'

ReactDOM.render(
    <BrowserRouter>
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
    <div style={{flex: 1, height: '100%', padding: '10px', display: 'flex', flexFlow: 'row nowrap', justifyContent: 'flex-start'}}>
    <Route exact path='/' component={Index}/>
    <Route exact path='/coding' component={Coding}/>
    <Route path='/variant/:variant' component={Variant}/>
    <Route path='/pheno/:pheno' component={Pheno}/>
    </div>
    </div>
    </BrowserRouter>
    , document.getElementById('reactEntry'))
