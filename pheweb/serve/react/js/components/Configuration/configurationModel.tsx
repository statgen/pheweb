import {NotFoundConfiguration} from "../NotFound/NotFoundModel";
import {ChipConfiguration} from "../Chip/chipModel";
import { IndexConfiguration } from "../Index/indexModel";
import { PhenotypeConfiguration } from "../Phenotype/phenotypeModel";
import { AboutConfiguration } from "../About/aboutModel";
import { VariantConfiguration } from "../Variant/variantModel";

export interface ConfigurationUserInterface {
    notFound? : NotFoundConfiguration;
    chip? : ChipConfiguration;
    index?: IndexConfiguration;
    phenotype?: PhenotypeConfiguration;
    about?: AboutConfiguration;
    variant? : VariantConfiguration;
}
export interface ConfigurationMetaData {}

export interface ConfigurationWindow extends  Window {
    config? : { userInterface? : ConfigurationUserInterface ;
                metaData? : ConfigurationMetaData ; }
}
