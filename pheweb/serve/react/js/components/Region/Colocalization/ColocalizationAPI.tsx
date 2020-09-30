import {LocusZoomData, SearchResults, searchResultsColocalization, SearchSummary} from "./ColocalizationModel";
import {ColocalizationParameter} from "./ColocalizationContext";
import {Colocalization} from "../../../common/Model";
import {compose, get } from "../../../common/Utilities";

/**
 * Given a colocalization parameter
 * return the root URL associated
 * with the parameter.
 *
 * @param parameter
 * @param suffix
 */
export const rest_url = (parameter : ColocalizationParameter,suffix : string = "") : string =>  `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}${suffix}`

/**
 * Given a parameter return the colocalization entries associated
 * with the parameter
 *
 * @param parameter to search
 * @param sink
 * @param getURL
 */
export const getSearchResults = (parameter: ColocalizationParameter | undefined,
                                 sink: (s: Colocalization[]) => void,
                                 getURL = get) =>
    parameter &&  getURL<SearchResults>(rest_url(parameter),compose(searchResultsColocalization,sink));

/**
 * Given a parameter return the locus zoom dat associated with that
 * parameter.
 *
 * @param parameter
 * @param sink
 * @param getURL
 */
export const getLocusZoomData = (parameter: ColocalizationParameter | undefined,
                                 sink : (s : LocusZoomData) => void,
                                 getURL : <LocusZoomData>(url: string, sink: (x: LocusZoomData) => void) => Promise<void> = get) =>
    parameter &&  getURL<LocusZoomData>(rest_url(parameter,'/finemapping'), sink);

/**
 * Given a parameter return the summary data associated with that
 * parameter.
 *
 * @param parameter
 * @param sink
 * @param getURL
 */
export const getSummary = (parameter: ColocalizationParameter | undefined,
                           sink : (s : SearchSummary) => void,
                           getURL : <SearchSummary>(url: string, sink: (x: SearchSummary) => void) => Promise<void> = get) =>
    parameter &&  getURL<SearchSummary>(rest_url(parameter,'/summary?clpa.gte=0.1'), sink);


