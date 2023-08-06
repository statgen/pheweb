import React from 'react'
import { ConfigurationWindow } from '../../components/Configuration/configurationModel'
import { mustacheSpan } from '../../common/commonUtilities'
import Search from './Search'
import Logout from './Logout'

declare let window: ConfigurationWindow
const application = window?.config?.application
const userInterface = window?.config?.userInterface

export const navLink = (href : string, label : string) => <li className="nav-item">
  <a className="nav-link" href={href} style={{ color: '#333', fontWeight: 'bold' }}>{label}</a>
</li>
const show = <X,>(toogle : boolean) => (value :X) => toogle?value:<></>

const Nav = () => {

  const logo = mustacheSpan(application?.logo || 'LOGO',{}) // mustacheSpan('', {});
  const title = application?.title || 'TITLE'
  const hasLOF = userInterface?.lof !== undefined,
    hasCoding = userInterface?.coding !== undefined,
    hasChip = userInterface?.chip !== undefined,
    hasAbout = userInterface?.about !== undefined;

  return <nav className="navbar navbar-expand-lg navbar-light nav-bg">
    <a className="navbar-brand" href="/">{ logo }</a>
    <a className="navbar-brand" href="/"> <span className='logo-header'>{ title }</span></a>
    <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarColor01"
            aria-controls="navbarColor01" aria-expanded="false" aria-label="Toggle navigation">
      <span className="navbar-toggler-icon"></span>
    </button>

    <div className="collapse navbar-collapse" id="navbarColor01">
      <Search/>
      <ul className="navbar-nav ml-auto">
        {show(hasLOF)(navLink('/lof','LOF'))}
        {show(hasCoding)(navLink('/coding','Coding'))}
        {show(hasChip)(navLink('/chip','Chip'))}
        {show(hasAbout)(navLink('/about','About'))}
        <Logout/>
      </ul>
    </div>
  </nav>
}

export default Nav
