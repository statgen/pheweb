import React from 'react'
import ReactDOM from 'react-dom'
import {
    BrowserRouter,
    Route,
    Switch,
    withRouter
} from 'react-router-dom'
import Index from './components/Index'
import LoF from './components/LoF'
import Chip from './components/Chip'
import Coding from './components/Coding'
import Variant from './components/Variant'
import Pheno from './components/Pheno'
import Region from './components/Region'

var element =  document.getElementById('reactEntry');
if (typeof(element) != 'undefined' && element != null)
{
ReactDOM.render(
    <BrowserRouter>
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
    <div style={{flex: 1, height: '100%', padding: '10px', display: 'flex', flexFlow: 'row nowrap', justifyContent: 'flex-start'}}>
    <Route exact path='/' component={Index}/>
    <Route exact path='/lof' component={LoF}/>
    <Route exact path='/chip' component={Chip}/>
    <Route exact path='/coding' component={Coding}/>
    <Route path='/variant/:variant' component={Variant}/>
    <Route path='/pheno/:pheno' component={Pheno}/>
    <Route path='/region.1/:region' component={Region}/>
    </div>
    </div>
    </BrowserRouter>
	, document.getElementById('reactEntry'))
}

import List from './components/colocalization/list'
import Summary from './components/colocalization/summary'
import ColocalizationProvider from './contexts/colocalization/ColocalizationContext'

$( document ).ready(function() {
    const list_target =  document.getElementById('colocalization_list_div');
    if (typeof(list_target) != 'undefined' && list_target != null){    
	const element = <ColocalizationProvider>
	      <List />
	</ColocalizationProvider>;
	ReactDOM.render(element, list_target);
    }
    const summary_target =  document.getElementById('colocalization_summary_div');
    if (typeof(summary_target) != 'undefined' && summary_target != null){    
	const element = <ColocalizationProvider>
	      <Summary />
	</ColocalizationProvider>;
	ReactDOM.render(element, summary_target);
    }
});
