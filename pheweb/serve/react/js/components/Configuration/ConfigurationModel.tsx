import {NotFoundConfiguration} from "../NotFound/NotFoundModel";

export interface ConfigurationUserInterface {
    notFound? : NotFoundConfiguration;
}
export interface ConfigurationMetaData {}

export interface ConfigurationState {
    userInterface : ConfigurationUserInterface ;
    metaData : ConfigurationMetaData ;
}

