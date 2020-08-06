import d3 from 'd3'             
import React , { useState, useEffect , useContext } from 'react';
import { Region , LzConf, Configuration } from './components';
import {populate, DataSources, Dashboard, Data, TransformationFunctions, positionIntToString } from 'locuszoom';
//import { FG_LDDataSource , GWASCatSource , ClinvarDataSource, ConditionalSource } from './custom_locuszooms';
import { region_layout, association, clinvar, gwas_cat , genes } from './region_layouts';

export const init_locus_zoom = (region : Region) => {
    const localBase : string = `/api/region/${region.pheno.phenocode}/lz-`;
    const localCondBase : string = `/api/conditional_region/${region.pheno.phenocode}/lz-`;
    const localFMBase : string = `/api/finemapped_region/${region.pheno.phenocode}/lz-`;
    const remoteBase : string = "https://portaldev.sph.umich.edu/api/v1/";
    const data_sources = new DataSources();

    const gene_source : number = region.genome_build == 37 ? 2 : 1
    const recomb_source : = region.genome_build == 37 ? 15 : 16
    const gwascat_source = region.genome_build == 37 ? [2,3] : [1,4]

    data_sources.add("assoc", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    populate("#lz-1", data_sources, region_layout);
}
