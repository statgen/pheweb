import {RegionParameter} from "./RegionModel";
import {compose, get} from "../../common/Utilities";
import {Colocalization} from "../../common/Model";
import {SearchResults, searchResultsColocalization} from "./Colocalization/ColocalizationModel";
import {rest_url} from "./Colocalization/ColocalizationAPI";
import {Region} from "./RegionModel";

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
    parameter &&  getURL<Region>(region_url(parameter),sink);
