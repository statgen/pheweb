import React , { useState, useEffect , useContext } from 'react';
import { Region } from './components';
import LocusZoom from 'locuszoom';


export const init_locus_zoom = (region : Region) => {
    const localBase : string = `/api/region/${region.pheno.phenocode}/lz-`;
    const localCondBase : string = `/api/conditional_region/${region.pheno.phenocode}/lz-`;
    const localFMBase : string = `/api/finemapped_region/${region.pheno.phenocode}/lz-`;
    const remoteBase : string = "https://portaldev.sph.umich.edu/api/v1/";
    const data_sources = new LocusZoom.DataSources();

    const gene_source : number = region.genome_build == 37 ? 2 : 1
    const recomb_source : number = region.genome_build == 37 ? 15 : 16
    const gwascat_source : Array<number> = region.genome_build == 37 ? [2,3] : [1,4]

    data_sources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    data_sources.add("conditional", ["ConditionalLZ", {url: localCondBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    data_sources.add("finemapping", ["FineMappingLZ", {url: localFMBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    data_sources.add("gene", ["GeneLZ", {url: `${remoteBase}annotation/genes/`, params:{source:gene_source}}])
    data_sources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])

    // clinvar needs to be added after gene because genes within locuszoom data chain are used for fetching
    data_sources.add("gwas_cat", new LocusZoom.Data.GWASCatSource({url: `${remoteBase}annotation/gwascatalog/`, params: { id:gwascat_source ,pvalue_field: "log_pvalue" }}));
    data_sources.add("clinvar", new LocusZoom.Data.ClinvarDataSource({url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/", params: { id:[1,4] ,pvalue_field: "log_pvalue" }}));
    if (region.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "/api/ld", params: { id:[1,4] ,pvalue_field: "association:pvalue", "var_id_field":"association:id" }}));
    } else {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/", params: { id:[1,4] ,pvalue_field: "association:pvalue", "var_id_field":"association:rsid" }}));
    }	
    data_sources.add("recomb", ["RecombLZ", { url: `${remoteBase}annotation/recomb/results/`, params: {source: recomb_source} }]);


    var scatters = ['association', 'conditional', 'finemapping', 'gwas_cat']

    LocusZoom.TransformationFunctions.set("neglog10_or_100", function(x) {
        if (x === 0) return 100;
        var log = -Math.log(x) / Math.LN10;
        return log;
    });

    LocusZoom.TransformationFunctions.set("log_pvalue", function(x) {
        return x
    });

    LocusZoom.TransformationFunctions.set("logneglog", function(x) {
	var pScaled = -Math.log10(x)
	if (pScaled > region.vis_conf.loglog_threshold) {
	    pScaled = region.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(region.vis_conf.loglog_threshold)
	}
	return pScaled
    })

    // dashboard components
    LocusZoom.Dashboard.Components.add("region", function(layout){
        LocusZoom.Dashboard.Component.apply(this, arguments);
        this.update = function(){
            if (!isNaN(this.parent_plot.state.chr) && !isNaN(this.parent_plot.state.start) && !isNaN(this.parent_plot.state.end)
                && this.parent_plot.state.chr != null && this.parent_plot.state.start != null && this.parent_plot.state.end != null){
                this.selector.style("display", null);
                this.selector.text(
                    'chr' + this.parent_plot.state.chr.toString() + ': ' +
                    LocusZoom.positionIntToString(this.parent_plot.state.start, 6, true).replace(' ','') + ' - ' +
                    LocusZoom.positionIntToString(this.parent_plot.state.end, 6, true).replace(' ', ''));
            } else {
                this.selector.style("display", "none");
            }
            if (layout.class){ this.selector.attr("class", layout.class); }
            if (layout.style){ this.selector.style(layout.style); }
            return this;
        };
    });

    function add_dashboard_button(name, func) {
        LocusZoom.Dashboard.Components.add(name, function(layout){
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function(){
                if (this.button)
                    return this;
                this.button = new LocusZoom.Dashboard.Component.Button(this)
                    .setColor(layout.color).setText(layout.text).setTitle(layout.title)
                    .setOnclick(func(layout).bind(this));
                this.button.show();
                return this.update();
            };
        });
    }

    add_dashboard_button('link', function(layout) {
        return function() {
            window.location.href = layout.url;
        };
    });
    add_dashboard_button('move', function(layout) {
        // see also the default component `shift_region`
        return function() {
            var start = this.parent_plot.state.start;
            var end = this.parent_plot.state.end;
            var shift = Math.floor(end - start) * layout.direction;
            this.parent_plot.applyState({
                chr: this.parent_plot.state.chr,
                start: start + shift,
                end: end + shift
            });
        }
    });



}