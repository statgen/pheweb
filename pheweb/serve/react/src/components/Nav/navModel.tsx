export interface UserInformation {
    email? : string
    username? : string | null
}

export interface LogoutMessage {
    status : 'success' ,
    message? : string | null
}