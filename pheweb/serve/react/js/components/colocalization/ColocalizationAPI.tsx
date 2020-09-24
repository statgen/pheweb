import {LocusZoomData, SearchResults} from "./ColocalizationModel";
import {ColocalizationParameter} from "./ColocalizationContext";

const root_url = (parameter : ColocalizationParameter) : string =>  `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}`

export const get : <T>(url: string,
                   setter : (t: T) => void,
                   fetchURL?: (input: RequestInfo, init?: RequestInit) => Promise<Response>) => void =
    (url, setter, fetchURL = fetch) => {
        fetchURL(url).
        then(response => response.json()).
        then(setter).
        catch(console.log);
    }

export const getSearchResults = (parameter: ColocalizationParameter | undefined,
                                 setter: (s: SearchResults) => void,
                                 getURL = get) =>
    parameter &&  getURL<SearchResults>(root_url(parameter),setter);


export const getLocusZoomData = (parameter: ColocalizationParameter | undefined,
                                 setter : (s : LocusZoomData) => void,
                                 getURL = get) =>
    parameter &&  getURL<LocusZoomData>(`${root_url(parameter)}/finemapping`, setter);

