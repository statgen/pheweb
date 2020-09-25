import {LocusZoomData, SearchResults, searchResultsColocalization, SearchSummary} from "./ColocalizationModel";
import {ColocalizationParameter} from "./ColocalizationContext";
import {Colocalization} from "../../common/Model";

/**
 * Given a colocalization parameter
 * return the root URL associated
 * with the parameter.
 *
 * @param parameter
 * @param suffix
 */
export const rest_url = (parameter : ColocalizationParameter,suffix : string = "") : string =>  `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}${suffix}`

export const get : <X,Y = X>(url: string,
                   setter : (y: Y) => void,
                   transformation? : (x : X) => Y,
                   fetchURL?: (input: RequestInfo, init?: RequestInit) => Promise<Response>) => void =
    (url, setter, transformation = x  => x, fetchURL = fetch) => {
        fetchURL(url).
        then(response => response.json()).
        then(transformation).
        then(setter).
        catch(console.error);
    }

export const getSearchResults = (parameter: ColocalizationParameter | undefined,
                                 setter: (s: Colocalization[]) => void,
                                 getURL = get) =>
    parameter &&  getURL<SearchResults,Colocalization[]>(rest_url(parameter),setter,searchResultsColocalization);


export const getLocusZoomData = (parameter: ColocalizationParameter | undefined,
                                 setter : (s : LocusZoomData) => void,
                                 getURL = get) =>
    parameter &&  getURL<LocusZoomData>(rest_url(parameter,'/finemapping'), setter);

export const getSummary = (parameter: ColocalizationParameter | undefined,
                                 setter : (s : SearchSummary) => void,
                                 getURL = get) =>
    parameter &&  getURL<SearchSummary>(rest_url(parameter,'/summary?clpa.gte=0.1'), setter);
