import {NotFoundConfiguration} from "../NotFound/NotFoundModel";
import {ChipConfiguration} from "../Chip/chipModel";
import { IndexConfiguration } from "../Index/indexModel";

export interface ConfigurationUserInterface {
    notFound? : NotFoundConfiguration;
    chip? : ChipConfiguration;
    index?: IndexConfiguration;
}
export interface ConfigurationMetaData {}

export interface ConfigurationWindow extends  Window {
    config? : { userInterface? : ConfigurationUserInterface ;
                metaData? : ConfigurationMetaData ; }
}
