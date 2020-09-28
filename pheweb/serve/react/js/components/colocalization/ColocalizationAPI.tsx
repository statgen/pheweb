import {LocusZoomData, SearchResults, searchResultsColocalization, SearchSummary} from "./ColocalizationModel";
import {ColocalizationParameter} from "./ColocalizationContext";
import {Colocalization} from "../../common/Model";
import {compose} from "../../common/Utilities";

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
 * Get url
 *
 * Takes a setter and an optional transformation and a fetchURL
 * Fetches url as a json object.  Calls the sink with the resulting
 * json.  If there is an error it's sent to the console.
 *
 * @param url
 * @param sink
 * @param fetchURL
 */
export const get : <X>(url: string,
                             sink : (x: X) => void,
                             fetchURL?: (input: RequestInfo, init?: RequestInit) => Promise<Response>) => void =
    (url, sink, fetchURL = fetch) => {
        fetchURL(url).
        then(response => response.json()).
        then(sink).
        catch(console.error);
    }
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
                                 getURL = get) =>
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
                           getURL = get) =>
    parameter &&  getURL<SearchSummary>(rest_url(parameter,'/summary?clpa.gte=0.1'), sink);

