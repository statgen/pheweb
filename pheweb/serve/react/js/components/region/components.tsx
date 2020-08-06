import React, { createContext, ReactChildren, useState , ReactNode } from 'react';


export interface VisConf {
    readonly info_tooltip_threshold : number,
    readonly loglog_threshold : number,
    readonly manhattan_colors : Array<string>
}

export interface LzConf {
    readonly p_threshold : number
    readonly assoc_fields: Array<string>,
    readonly ld_ens_pop: string,
    readonly ld_ens_window: number,
    readonly ld_max_window: number,
    readonly ld_service: string,
    readonly prob_threshold: number,
    readonly tooltip_html: string };

export interface Phenotype {
    readonly num_cases: number,
    readonly num_cases_prev: number,
    readonly num_controls: number,
    readonly phenocode: string,
    readonly phenostring: string,
    readonly category: string };

export interface Region {
    readonly pheno: Phenotype,
    readonly lz_conf : LzConf,
    readonly vis_conf : VisConf,
    readonly genome_build : number,
    readonly region: string,
    readonly browser: string
};

export interface RegionState { region : Region ,
                               setRegion : React.Dispatch<React.SetStateAction<Region>> };

/*
export const RegionContext = createContext<Partial<RegionState>>({});

type Props = { children: ReactNode };

const RegionProvider = (props : Props) => {
    const [ region, setRegion ] = useState<RegionState>(null);
    return (<RegionContext.Provider value={ { region, setRegion } } >{ props.children }</RegionContext.Provider>);
}

export default RegionProvider;
*/
