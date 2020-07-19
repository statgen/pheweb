import React, { createContext, ReactChildren, useState , ReactNode } from 'react';


export interface VisConf {
    info_tooltip_threshold : number,
    loglog_threshold : number,
    manhattan_colors : Array<string>
}

export interface LzConf {
    p_threshold : number
    assoc_fields: Array<string>,
    ld_ens_pop: string,
    ld_ens_window: number,
    ld_max_window: number,
    ld_service: string,
    prob_threshold: number,
    tooltip_html: string };

export interface Phenotype {
    num_cases: number,
    num_cases_prev: number,
    num_controls: number,
    phenocode: string,
    phenostring: string,
    category: string };

export interface Region {
    pheno: Phenotype,
    lz_conf : LzConf,
    vis_conf : VisConf,
    genome_build : number,
    region: string
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
