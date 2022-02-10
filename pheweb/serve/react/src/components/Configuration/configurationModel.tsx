import { NotFoundConfiguration } from '../NotFound/NotFoundModel'
import { ChipConfiguration } from '../Chip/chipModel'
import { IndexConfiguration } from '../Index/indexModel'
import { PhenotypeConfiguration } from '../Phenotype/phenotypeModel'
import { AboutConfiguration } from '../About/aboutModel'
import { VariantConfiguration } from '../Variant/variantModel'
import { TopHitsConfiguration } from '../TopHits/topHitsModel'
import { Gene } from '../Gene/geneModel'
import { LOFConfiguration } from '../LOF/lofModel'
import { CodingConfiguration } from '../Coding/codingModel'

export interface ApplicationConfiguration {
    readonly root? : string
    title: string
    logo : string
    vis_conf : object
    model : object
}


export interface ConfigurationUserInterface {
    application? : ApplicationConfiguration
    notFound? : NotFoundConfiguration
    chip? : ChipConfiguration
    index?: IndexConfiguration
    phenotype?: PhenotypeConfiguration
    about?: AboutConfiguration
    variant? : VariantConfiguration
    topHits? : TopHitsConfiguration
    gene? : Gene.Configuration
    lof? : LOFConfiguration
    coding? : CodingConfiguration
}
export interface ConfigurationMetaData {}

export interface ConfigurationWindow extends  Window {
    config? : { userInterface? : ConfigurationUserInterface
                metaData? : ConfigurationMetaData
                application? : ApplicationConfiguration
    }
}

declare let window: ConfigurationWindow;

export const resolveURL = (url : string) => {
    const root = window.config?.application?.root
    return (root)?`${root}${url}`:url
}