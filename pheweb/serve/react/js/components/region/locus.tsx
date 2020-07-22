import React , { useState, useEffect , useContext } from 'react';
import { Region , LzConf} from './components';
import {DataSources, Dashboard, Data, TransformationFunctions, positionIntToString } from 'locuszoom';
import { FG_LDDataSource , GWASCatSource , ClinvarDataSource, ConditionalSource } from './custom_locuszooms';

export const init_locus_zoom = (region_ : Region) => {
    const region : Region = {...region_}; 
    const localBase : string = `/api/region/${region.pheno.phenocode}/lz-`;
    const localCondBase : string = `/api/conditional_region/${region.pheno.phenocode}/lz-`;
    const localFMBase : string = `/api/finemapped_region/${region.pheno.phenocode}/lz-`;
    const remoteBase : string = "https://portaldev.sph.umich.edu/api/v1/";
    const data_sources = new DataSources();
    
    const gene_source : number = region.genome_build == 37 ? 2 : 1
    const recomb_source : number = region.genome_build == 37 ? 15 : 16
    const gwascat_source : Array<number> = region.genome_build == 37 ? [2,3] : [1,4]
    console.log(ConditionalSource);
    console.log(region);
    data_sources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    data_sources.add("conditional", ["ConditionalLZ", {url: localCondBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    data_sources.add("finemapping", ["FineMappingLZ", {url: localFMBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);    
    data_sources.add("gene", ["GeneLZ", {url: `${remoteBase}annotation/genes/`, params:{source:gene_source}}])
    data_sources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" ,
							  params : { build : region.genome_build } }])
    data_sources.add("gwas_cat", new GWASCatSource({url: `${remoteBase}annotation/gwascatalog/`,
						    genome_build : region.genome_build , 
						    params: { id:gwascat_source ,pvalue_field: "log_pvalue" }}));
    data_sources.add("clinvar", new ClinvarDataSource({url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
						       genome_build : region.genome_build , 
						       params: { id:[1,4] ,pvalue_field: "log_pvalue" }}));
    // clinvar needs to be added after gene because genes within locuszoom data chain are used for fetching
    if (region.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new FG_LDDataSource({url: "/api/ld",
						    params: { id:[1,4] ,pvalue_field: "association:pvalue", "var_id_field":"association:id" },
						    lzConfig: region.lz_conf }));
    } else {
	data_sources.add("ld", new FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/",
						    params: { id:[1,4] ,pvalue_field: "association:pvalue", "var_id_field":"association:rsid" },
						    lzConfig: region.lz_conf}));
    }	
    data_sources.add("recomb", ["RecombLZ", { url: `${remoteBase}annotation/recomb/results/`, params: {source: recomb_source} }]);

    var scatters = ['association', 'conditional', 'finemapping', 'gwas_cat']

    TransformationFunctions.set("neglog10_or_100", function(x : number) {
        if (x === 0) return 100;
        var log = -Math.log(x) / Math.LN10;
        return log;
    });

    TransformationFunctions.set("log_pvalue", function(x: number) {
        return x
    });

    TransformationFunctions.set("logneglog", function(x: number) {
	var pScaled = -Math.log10(x)
	if (pScaled > region.vis_conf.loglog_threshold) {
	    pScaled = region.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(region.vis_conf.loglog_threshold)
	}
	return pScaled
    })
    
    Dashboard.Components.add("region", function(layout){
        Dashboard.Component.apply(this, arguments);
        this.update = function(){
            if (!isNaN(this.parent_plot.state.chr) && !isNaN(this.parent_plot.state.start) && !isNaN(this.parent_plot.state.end)
                && this.parent_plot.state.chr != null && this.parent_plot.state.start != null && this.parent_plot.state.end != null){
                this.selector.style("display", null);
                this.selector.text(
                    'chr' + this.parent_plot.state.chr.toString() + ': ' +
                    positionIntToString(this.parent_plot.state.start, 6, true).replace(' ','') + ' - ' +
                    positionIntToString(this.parent_plot.state.end, 6, true).replace(' ', ''));
            } else {
                this.selector.style("display", "none");
            }
            if (layout.class){ this.selector.attr("class", layout.class); }
            if (layout.style){ this.selector.style(layout.style); }
            return this;
        };
    });

    // dashboard components

    const add_dashboard_button = (name : string, func : (layout : any)=> any )  => {
        Dashboard.Components.add(name, function(layout){
            Dashboard.Component.apply(this, arguments);
            this.update = function(){
                if (this.button)
                    return this;
                this.button = new Dashboard.Component.Button(this)
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

    const show_conditional = (index) => {
        var params = data_sources.sources.conditional.params
        params.dataIndex = index
        var panel = window.plot.panels.conditional
        panel.setTitle('conditioned on ' + params.allData[index].conditioned_on)
        panel.data_layers.associationpvalues.data = data_sources.sources.conditional.parseArraysToObjects(params.allData[index].data, params.fields, params.outnames, params.trans)
        panel.data_layers.associationpvalues.render()
        $('#cond_options label').each((i, tag) => {
            if (i === index) {
                tag.classList.add('active')
            } else {
                tag.classList.remove('active')
            }
        });
        update_mouseover('conditional')
        $('#cond_options label')[index].classList.add('active')
    }

    const show_finemapping = (method) => {
        var params = data_sources.sources.finemapping.params
        params.dataIndex = params.allData.reduce((acc, cur, i) => cur.type == method ? i : acc, -1)
        var panel = window.plot.panels.finemapping
        panel.setTitle(method + ' credible sets')
        panel.data_layers.associationpvalues.data = data_sources.sources.finemapping.parseArraysToObjects(params.allData[params.dataIndex].data, params.fields, params.outnames, params.trans)
        panel.data_layers.associationpvalues.render()
        $('#finemapping_options label').each((i, tag) => {
            if (i === params.dataIndex) {
                tag.classList.add('active')
            } else {
                tag.classList.remove('active')
            }
        });
        update_mouseover('finemapping')
        $('#finemapping_options label')[params.dataIndex].classList.add('active')
    }

    const update_mouseover = (key) => {
        var params = data_sources.sources[key].params
        params.lookup = {}
        var dots = d3.selectAll("[id='lz-1." + key + ".associationpvalues.data_layer'] path")
        dots.each((d, i) => {
            params.lookup[d[key + ':id']] = i
        });
        var scatters_in = scatters.filter(key2 => key2 != key && window.plot.panels[key2])
        dots.on('mouseover', (d, i) => {
            scatters_in.forEach(key2 => {
                var idx = data_sources.sources[key2].params.lookup &&
                    data_sources.sources[key2].params.lookup[d[key + ':id']]
                if (idx !== undefined) {
                    d3.selectAll("[id='lz-1." + key2 + ".associationpvalues.data_layer'] path").filter((d, j) => j == idx).classed('lz-highlight', true)
                }
            })
        })
        dots.on('mouseout', (d, i) => {
            scatters_in.forEach(key2 => {
                d3.selectAll("[id='lz-1." + key2 + ".associationpvalues.data_layer'] path").classed('lz-highlight', false)
            })
        })
    }
    
    const plot = LocusZoom.populate("#lz-1", data_sources);


    /*
    plot.addPanel(panel_layouts.association)
    plot.addPanel(panel_layouts.clinvar)
    plot.addPanel(panel_layouts.gwas_cat)
    plot.addPanel(panel_layouts.genes)



    $(function() {

        // Populate the div with a LocusZoom plot using the default layout
        window.plot = LocusZoom.populate("#lz-1", data_sources, window.region_layout);
        window.plot.addPanel(window.panel_layouts.association)
        window.plot.addPanel(window.panel_layouts.clinvar)
        window.plot.addPanel(window.panel_layouts.gwas_cat)
        window.plot.addPanel(window.panel_layouts.genes)
        window.cond_fm_regions.forEach(region => {
            if (region.type == 'susie' || region.type == 'finemap') {
                if (!window.plot.panels['finemapping']) {
                    window.plot.addPanel(window.panel_layouts['finemapping'])
                }
            } else {
                window.plot.addPanel(window.panel_layouts[region.type])
            }
        })

        window.plot.panels['clinvar'].on('data_rendered', function() {
            update_mouseover('clinvar')
        })
        
        scatters.filter(key => window.plot.panels[key]).forEach(key => {
            window.plot.panels[key].on("data_rendered", function() {
                console.log(key + ' rendered')
                update_mouseover(key)
                if (key == 'conditional') {
                    var params = data_sources.sources[key].params
                    this.setTitle('conditioned on ' + params.allData[params.dataIndex].conditioned_on)
                }
                if (key == 'finemapping') {
                    var params = data_sources.sources[key].params
                    this.setTitle(params.allData[params.dataIndex].type + ' credible sets')
                }
                this.setDimensions(this.layout.width, 200);
                this.parent.setDimensions();
                this.parent.panel_ids_by_y_index.forEach(function(id) {
                    if (id == 'clinvar') {// || id == 'genes') {
                        this.parent.panels[id].layout.proportional_height = 0.02
                    } else if (id != 'genes') {
                        if (this.parent.panel_ids_by_y_index.length > 4) {
                            this.parent.panels[id].layout.proportional_height = 0.1
                        } else {
                            this.parent.panels[id].layout.proportional_height = 0.15
                        }
                    }
                }.bind(this));
                // after all have been rendered, scale gene panel to height
                // have not found another way to keep panels heights somewhat ok
                // this now assumes that other panels have been rendered before the last assoc/cond/finemap panel
                this.rendered = true
                var nRendered = scatters.reduce((acc, cur) => acc + (window.plot.panels[cur] && window.plot.panels[cur].rendered === true ? 1 : 0), 0)
                if (nRendered == scatters.length) {
                    console.log('scaling gene panel')
                    window.plot.panels.genes.scaleHeightToData()
                }
                this.parent.positionPanels();
            })
        })

        if (window.cond_fm_regions && window.cond_fm_regions.length > 0) {
            var cond_regions = window.cond_fm_regions.filter(region => region.type == 'conditional')
            var n_cond_signals = cond_regions.length > 0 ? cond_regions[0].n_signals : 0
            var summary_html = window.cond_fm_regions.map(region =>
                                                          region.type == 'finemap' ?
                                                          '<span>' + region.n_signals + ' ' + region.type + ' signals (prob. ' + region.n_signals_prob.toFixed(3) + ')</span><br/>' :
                                                          '<span>' + region.n_signals + ' ' + region.type + ' signals</span><br/>'
                                                         ).join('') + n_cond_signals > 0 ? '<span>Conditional analysis results are approximations from summary stats. Conditioning is repeated until no signal p < 1e-6 is left.</span><br/>' : ''
            $('#region_summary').html(summary_html)
            if (n_cond_signals > 1) {
                var opt_html = window.cond_fm_regions.filter(region => region.type == 'conditional')[0].paths.map((path, i) => 
                  '<label onClick="show_conditional(' + i + ')" data-cond-i="' + i + '" class="btn btn-primary' + (i === 0 ? ' active' : '') + '"><span>' + (i+1) + '</span></label>'
                ).join('\n')
                $('#cond_options').html('<p>Show conditioned on ' + opt_html + ' variants<span></p>')
            }
            if (window.cond_fm_regions.filter(region => region.type == 'susie' || region.type == 'finemap').length > 1) {
                var opt_html = window.cond_fm_regions.filter(region => region.type == 'susie' || region.type == 'finemap').map((region, i) => 
                  '<label onClick="show_finemapping(\'' + region.type + '\')' + '" class="btn btn-primary' + (i === 0 ? ' active' : '') + '"><span>' + region.type + '</span></label>'
                ).join('\n')
                $('#finemapping_options').html('<p>Show fine-mapping from ' + opt_html + '<span></p>')
            }
        }
    });

    */


}
