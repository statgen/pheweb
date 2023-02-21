import { NotFoundConfiguration } from '../NotFound/notFoundModel'
import { ChipConfiguration } from '../Chip/chipModel'
import { CodingConfiguration } from '../Coding/codingModel'
import { IndexConfiguration } from '../Index/indexModel'
import { PhenotypeConfiguration } from '../Phenotype/phenotypeModel'
import { AboutConfiguration } from '../About/aboutModel'
import { VariantConfiguration } from '../Variant/variantModel'
import { TopHitsConfiguration } from '../TopHits/topHitsModel'
import { Gene } from '../Gene/geneModel'
import { LOFConfiguration } from '../LOF/lofModel'
import { Region } from '../Region/RegionModel'

export interface ApplicationConfiguration {
    readonly root? : string
    title: string
    logo : string
    vis_conf : object
    model : { locuszoomTooltip : string }
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
    region? : Region.Configuration
}
export interface ConfigurationMetaData {}

export interface ConfigurationWindow extends  Window {
    config? : { userInterface? : ConfigurationUserInterface
                metaData? : ConfigurationMetaData
                application? : ApplicationConfiguration
    }
}

declare let window: ConfigurationWindow;

export const searchParams = (params : { [ key : string ] : (string | string[]) }) : string => {
       const urlSearchParams = new URLSearchParams()
        const keys = Object.keys(params).sort()
	keys.forEach(key => {
	   const value = params[key];
            if(Array.isArray(value)){
                value.forEach(v => urlSearchParams.append(key,v));
            } else {
                urlSearchParams.append(key,value);
            }
        })
	return urlSearchParams.toString();
}

export const resolveURL = (relativeURL : string,params : { [ key : string ] : (string | string[]) } | undefined = undefined) : string => {
    const root = window?.config?.application?.root
    const url = new URL(relativeURL,root?root:window.location.origin)
    if(params !== undefined){
        url.search = searchParams(params);
    }
    return url.toString()
}