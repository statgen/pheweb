/**
 * Compose fuction
 *
 * see : https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html
 *
 * @param f
 * @param g
 */
export function compose<A, B, C>(f: (arg: A) => B, g: (arg: B) => C): (arg: A) => C {
    return x => g(f(x));
}

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
                       sink : (x: X) => void) => Promise<void> = (url, sink) => {
    console.log(url);
    return fetch(url).
        then(response => response.json()).
        then(sink).
        catch(console.error);
}