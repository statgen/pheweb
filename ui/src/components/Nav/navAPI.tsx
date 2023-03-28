import {UserInformation , LogoutMessage} from './navModel'
import { resolveURL } from "../Configuration/configurationModel";
import { get , deleteRequest} from '../../common/commonUtilities'

export const getAuthentication = (sink: (u: UserInformation) => void, getURL = get) : void => {
    getURL(resolveURL(`/api/authentication`), sink, (url : string) => (e : Error) =>  {})
}


export const doLogout = (sink : (l : LogoutMessage) => void,deleteURL = deleteRequest) : void => {
    deleteURL(resolveURL(`/api/authentication`), sink)
}