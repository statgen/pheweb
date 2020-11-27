import React, { createContext, ReactChildren, useState , ReactNode } from 'react';
import {Locus, locusFromStr} from "../../common/Model";

export type DataSourceKeys = "association" | "conditional" | "finemapping" | "colocalization" |
    "gene" | "constraint" | "gwas_cat" | "clinvar" | "ld" | "recomb"

export interface Params { allData : { type : layout_types , data : unknown , conditioned_on : string }[] ,
    fields : unknown ,
    outnames : unknown,
    trans : unknown ,
    dataIndex : number ,
    lookup : { [key : string] : number },
    handlers : ((position : number | undefined) => void)[] | undefined
};


export interface RegionParameter {
    readonly locus : Locus,
    readonly phenotype : string ,
};

export const createParameter = (href : string = window.location.href) : RegionParameter | undefined  => {
    const match = href.match("\/region\/([^\/]+)\/([^\/]+)$")
    if(match){
        const [ignore, phenotype, locusString ] : Array<string> = match;
        const locus : Locus | undefined = locusFromStr(locusString)
        return locus?{ phenotype, locus  } : undefined
    }
}

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


export type layout_types = 'finemap' | 'susie' | 'association' | 'genes' | 'clinvar' | 'gwas_cat' | 'colocalization' | 'conditional'

export interface CondFMRegions {
    chr: number,
    end: number,
    n_signals: number,
    n_signals_prob: number,
    path: string,
    start: number,
    type: layout_types,
    variants: string };

export interface Region {
    readonly pheno: Phenotype,
    readonly cond_fm_regions: CondFMRegions [] | undefined | null;
    readonly lz_conf : LzConf | undefined | null,
    readonly vis_conf : VisConf,
    readonly genome_build : number,
    readonly region: string,
    readonly browser: string
};