import React, { useState, useEffect } from 'react'
import { getAuthentication , doLogout} from './navAPI'
import {UserInformation , LogoutMessage} from './navModel'
import { ConfigurationWindow } from '../../components/Configuration/configurationModel'

declare let window: ConfigurationWindow
const application = window?.config?.application
const logout_url = new URL( '/', application?.root || window.location.origin)

const Logout = () => {
    const [currentUser, setCurrentUser] = useState<UserInformation| undefined>(undefined);
    useEffect(() => {
        getAuthentication(setCurrentUser)
    },[]);

    const logoutHandler = (l : LogoutMessage) => { window.location.replace(logout_url.toString()) }
    const clickHandler = () => doLogout(logoutHandler)

    const result = (currentUser === undefined)?
        <></>:
        <li className="nav-item">
            <a className="nav-link" onClick={clickHandler} style={{color: '#333', fontWeight: 'bold'}}>Logout ( {currentUser.email} )</a>
        </li>
    return result
}

export default Logout