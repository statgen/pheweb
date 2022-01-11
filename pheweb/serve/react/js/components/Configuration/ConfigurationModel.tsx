import {NotFoundConfiguration} from "../NotFound/NotFoundModel";
import {ChipConfiguration} from "../Chip/chipModel";

export interface ConfigurationUserInterface {
    notFound? : NotFoundConfiguration;
    chip? : ChipConfiguration;
}
export interface ConfigurationMetaData {}

export interface ConfigurationWindow extends  Window {
    config? : { userInterface? : ConfigurationUserInterface ;
                metaData? : ConfigurationMetaData ; }
}
