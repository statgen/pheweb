import { Region, RegionParameter } from "./RegionModel";
import { get } from "../../common/Utilities";
import { resolveURL } from "../Configuration/configurationModel";

/**
 * Given a colocalization parameter
 * return the url to get region
 * metadata
 *
 * @param parameter
 */
export const region_url = (parameter : RegionParameter) : string =>  `/api/region/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}`

/**
 * Given a parameter return the region matching
 * parameter
 *
 * @param parameter to search
 * @param sink
 * @param getURL
 */
export const getRegion = (parameter: RegionParameter | undefined,
                          sink: (s: Region) => void,
                          getURL = get) =>
    parameter &&  getURL<Region>(resolveURL(region_url(parameter)),sink);
