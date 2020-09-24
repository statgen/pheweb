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