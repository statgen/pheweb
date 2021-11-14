import {NotFoundConfiguration} from "../NotFound/NotFoundModel";

export interface ConfigurationUserInterface {
    notFound? : NotFoundConfiguration;
}
export interface ConfigurationMetaData {}

export interface ConfigurationWindow extends  Window {
    config? : { userInterface? : ConfigurationUserInterface ;
                metaData? : ConfigurationMetaData ; }
}