import React from 'react'
import { ConfigurationWindow } from "./components/Configuration/configurationModel";
import { mustacheSpan } from "./common/Utilities";


declare let window: ConfigurationWindow;
const application = window?.config?.application;


const Nav = () => {
  const logo = mustacheSpan((application && application.logo) || 'LOGO',{}) // mustacheSpan('', {});
  const title = (application && application.title) || 'TITLE'
  const config = { lof: false, coding: false, chip: false, about: false, currentUser: undefined }

  return <nav className='navbar navbar-default' style={{ background: 'white' }}>
    <div className='container-fluid'>
      <div className='navbar-header'>
        { logo }
        <a href='/'>
          <span className='logo-header'>{ title }</span>
        </a>
        <div className='navbar-left' id='navbar_form_container'>
          <form action='#' className='navbar-form searchbox-form' role='search'>
            <div className='form-group' id='navbar-awesomebar'>
              <input id='navbar-searchbox-input' name='query' className='form-control typeahead' type='text' size={40} placeholder='Search for a variant, gene, or phenotype' />
            </div>
          </form>
        </div>
      </div>
      {/* Collect the nav links, forms, and other content for toggling */}
      <div className='collapse navbar-collapse' id='navbar-collapse'>
        <ul className='nav navbar-nav navbar-right'>
          <li><a href='/random' style={{ color: '#333', fontWeight: 'bold' }}>Random</a></li>
          {config.lof ? <li><a href='/lof' style={{ color: '#333', fontWeight: 'bold' }}>LoF</a></li> : <></>}
          {config.coding ? <li><a href='/coding' style={{ color: '#333', fontWeight: 'bold' }}>Coding</a></li> : <></>}
          {config.chip ? <li><a href='/chip' style={{ color: '#333', fontWeight: 'bold' }}>Chip</a></li> : <></>}
          {config.about ? <li><a href='/about' style={{ color: '#333', fontWeight: 'bold' }}>About</a></li> : <></>}
          {config.currentUser ? <li><a href='/logout' style={{ color: '#333', fontWeight: 'bold' }}>Logout ({config.currentUser})</a></li> : <></>}
        </ul>
      </div>
    </div>
  </nav>
}

export default Nav
