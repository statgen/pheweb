// https://stackoverflow.com/questions/43702518/typescript-property-log10-does-not-exist-on-type-math
declare interface Math {
    log10(x: number): number;
}
