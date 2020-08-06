'use strict';

// DEPENDENCIES: This js depends on custom_locuszoom.js and region_layouts.js which need to be included first in html files. We are moving to webpack to take care of the dependencies and this documentation is
// an interim reminder
const region_layout = {

    width: 800,
    height: 400,
    "min_width": 800,
    "min_height": 400,
    responsive_resize: 'both',
    "resizable": "responsive",
    "min_region_scale": 2e4,
    "max_region_scale": 20e6,
    "panel_boundaries": true,
    mouse_guide: true,

    "dashboard": { "components": [] },
    "panels": []
}

const panel_layouts = {}

panel_layouts.assoc = {
    "id": "assoc",
    "title": { "text":window.browser, "x":55, "y":30 } ,
    "proportional_height": 0.2,
    "min_width": 400,
    "min_height": 150,
    "y_index": 0,
    "margin": {
        "top": 10,
        "right": 50,
        "bottom": 40,
        "left": 50
    },
    "inner_border": "rgb(210, 210, 210)",
    "dashboard": {
        "components": [{
            "type": "toggle_legend",
            "position": "right",
            "color": "green"
        }]
    },
    "axes": {
        "x": {
            "label_function": "chromosome",
            "label_offset": 32,
            "tick_format": "region",
            "extent": "state",
            "render": true,
            "label": "Chromosome {{chr}} (Mb)"
        },
        "y1": {
            "label": "-log10 p-value",
            "label_offset": 28,
            "render": true,
            "label_function": null
        }
    },
    "legend": {
        "orientation": "vertical",
        "origin": { "x": 55, "y": 40 },
        "hidden": true,
        "width": 91.66200256347656,
        "height": 138,
        "padding": 5,
        "label_size": 12
    },
    "interaction": {
        "drag_background_to_pan": true,
        "drag_x_ticks_to_scale": true,
        "drag_y1_ticks_to_scale": true,
        "drag_y2_ticks_to_scale": true,
        "scroll_to_zoom": true,
        "x_linked": true,
        "y1_linked": false,
        "y2_linked": false
    },
    "data_layers":
    [{ "id": "significance",
       type: "orthogonal_line",
       orientation: "horizontal",
       offset: -Math.log10(5e-8),
     },
     LocusZoom.Layouts.get("data_layer", "recomb_rate", { unnamespaced: false }),
     { "namespace": {
	 "default": "assoc",
	 "ld": "ld" },
       "id": "associationpvalues",
       "type": "scatter",
       "point_shape": {
	   "scale_function": "categorical_bin",
	   "field": "assoc:most_severe",
	   "parameters": {
	       "categories": ["frameshift variant",
			      "inframe deletion",
			      "inframe insertion",
			      "splice acceptor variant",
			      "splice donor variant",
			      "start lost",
			      "stop gained",
			      "stop lost",
			      "TFBS ablation",
			      "missense variant"],
	       "values": ["triangle-up",
			  "triangle-down",
			  "triangle-down",
			  "triangle-up",
			  "triangle-up",
			  "triangle-down",
			  "triangle-down",
			  "triangle-down",
			  "triangle-down",
			  "square"],
	       "null_value": "circle"
	   }
       },
       "point_size": {
	   "scale_function": "if",
	   "field": "ld:isrefvar",
	   "parameters": {
	       "field_value": 1,
	       "then": 80,
	       "else": 40
	   }
       },
       "point_size": {
	   "scale_function": "categorical_bin",
	   "field": "assoc:most_severe",
	   "parameters": {
	       "categories": ["frameshift variant",
			      "inframe deletion",
			      "inframe insertion",
			      "splice acceptor variant",
			      "splice donor variant",
			      "start lost",
			      "stop gained",
			      "stop lost",
			      "TFBS ablation",
			      "missense variant"],
	       "values": [80, 80, 80, 80, 80, 80, 80, 80, 80, 80],
	       "null_value": 40
	   }
       },
       "color": [{
	   "scale_function": "if",
	   "field": "ld:isrefvar",
	   "parameters": {
	       "field_value": 1,
	       "then": "#9632b8"
			    }
       }, {
	   "scale_function": "numerical_bin",
	   "field": "ld:state",
	   "parameters": {
	       "breaks": [0, 0.05, 0.2, 0.4, 0.6, 0.8, 0.9],
	       "values": ["#555555", "#357ebd", "#46b8da", "#5cb85c", "#f3ca54", "#eea236", "#d43f3a"]
	   }
       }, "#B8B8B8"],
       fill_opacity: 0.7,
       "legend": [{
	   "shape": "triangle-up",
	   "color": "#B8B8B8",
	   "size": 80,
	   "label": "frameshift, splice acceptor, splice donor",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "square",
	   "color": "#B8B8B8",
	   "size": 80,
	   "label": "missense",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "triangle-down",
	   "color": "#B8B8B8",
	   "size": 80,
	   "label": "inframe indel, start lost, stop lost, stop gained",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#B8B8B8",
	   "size": 40,
	   "label": "other",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#9632b8",
	   "size": 40,
	   "label": "LD Ref Var",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#d43f3a",
	   "size": 40,
	   "label": "1.0 > r² ≥ 0.9",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#eea236",
	   "size": 40,
	   "label": "0.9 > r² ≥ 0.8",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#f3ca54",
	   "size": 40,
	   "label": "0.8 > r² ≥ 0.6",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#5cb85c",
	   "size": 40,
	   "label": "0.6 > r² ≥ 0.4",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#46b8da",
	   "size": 40,
	   "label": "0.4 > r² ≥ 0.2",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#357ebd",
	   "size": 40,
	   "label": "0.2 > r² ≥ 0.05",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#555555",
	   "size": 40,
	   "label": "0.05 > r² ≥ 0.0",
	   "class": "lz-data_layer-scatter"
       }, {
	   "shape": "circle",
	   "color": "#B8B8B8",
	   "size": 40,
	   "label": "no r² data",
	   "class": "lz-data_layer-scatter"
       }],
       fields: ["assoc:id", "assoc:chr", "assoc:position", "assoc:ref", "assoc:alt", "assoc:pvalue", "assoc:pvalue|neglog10_or_100", "assoc:beta", "assoc:sebeta", "assoc:rsid", "assoc:maf", "assoc:maf_cases", "assoc:maf_controls", "assoc:most_severe", "assoc:fin_enrichment", "assoc:INFO", "ld:state", "ld:isrefvar"],
       // ldrefvar can only be chosen if "pvalue|neglog10_or_100" is present.  I forget why.
       id_field: "assoc:id",
			behaviors: {
			    onmouseover: [{action: "set", status:"selected"}],
			    onmouseout: [{action: "unset", status:"selected"}] 
			},
       tooltip: {
	   closable: false,
	   "show": {
	       "or": ["highlighted", "selected"]
	   },
	   "hide": {
	       "and": ["unhighlighted", "unselected"]
	   },
	   html: window.lz_conf.tooltip_html.replace('PHENO', window.pheno.phenostring || window.pheno.phenocode)
       },

       "x_axis": {
	   "field": "assoc:position",
	   "axis": 1
       },
       "y_axis": {
	   "axis": 1,
	   "field": "assoc:pvalue|neglog10_or_100",
	   "floor": 0,
	   "upper_buffer": 0.1,
	   "min_extent": [0, 10]
       },
       "transition": false,
     }],
    "description": null,
    "origin": {
        "x": 0,
        "y": 0
    },
    "proportional_origin": {
        "x": 0,
        "y": 0
    },
    "background_click": "clear_selections",
}



LocusZoom.Data.FG_LDDataSource = LocusZoom.Data.Source.extend(function(init) {
    this.parseInit(init);
}, "FG_LDDataSourceLZ");

// https://rest.ensembl.org/info/variation/populations/homo_sapiens?content-type=application/json;filter=LD
// ld/:species/:id/:population_name
LocusZoom.Data.FG_LDDataSource.prototype.getURL = function(state, chain, fields) {

    var findExtremeValue = function(x, pval, sign) {
        pval = pval || "pvalue";
        sign = sign || 1;
        var extremeVal = sign * x[0][pval], extremeIdx=0;
        for(var i=1; i<x.length; i++) {
            if (x[i][pval] * sign > extremeVal) {
                extremeVal = x[i][pval] * sign;
                extremeIdx = i;
            }
        }
        return extremeIdx;
    };

    var extremeIdx = findExtremeValue(  chain.body, this.params.pvalue_field, -1 )
    var topvar = chain.body[extremeIdx]
    var refvar=topvar[this.params.var_id_field]
    chain.header.ldrefvar = topvar
    if (window.lz_conf.ld_service.toLowerCase() == 'finngen') {
	var windowSize = Math.min(state.end - state.start + 10000, window.lz_conf.ld_max_window)
	return this.url + "?variant=" + topvar['assoc:chr'] + ':' + topvar['assoc:position'] + ':' + topvar['assoc:ref'] + ':' + topvar['assoc:alt'] + "&window=" + windowSize + "&panel=sisu3"
    } else {
	return refvar ? this.url + refvar + "/" + window.lz_conf.ld_ens_pop + "?window_size=" + window.lz_conf.ld_ens_window : this.url + ' lead variant has no rsid, could not get LD'
    }

};

LocusZoom.Data.FG_LDDataSource.prototype.parseResponse = function(resp, chain, fields, outnames, trans) {

    // if ld was not fetched, return the previous chain skipping this data source
    if (!resp) return chain

    var res
    if (window.lz_conf.ld_service.toLowerCase() == 'finngen') {
	res = JSON.parse(resp)['ld']
    } else {
	res = JSON.parse(resp)
    }
    var lookup = {}
    for (var i = 0; i < res.length; i++) {
	res[i].variation1 = res[i].variation1.replace(/^23:/, 'X:')
	res[i].variation2 = res[i].variation2.replace(/^23:/, 'X:')
        lookup[ res[i].variation2 ] = res[i];
    }

    var ld_field = outnames[ fields.indexOf("state") ]
    var reffield = outnames[ fields.indexOf("isrefvar") ]

    for (var i = 0; i < chain.body.length; i++) {

	var d, isref
	if (window.lz_conf.ld_service.toLowerCase() == 'finngen') {
            d = lookup[chain.body[i][this.params.var_id_field].replace('_', ':').replace('/', ':')]
            //isref = chain.header.ldrefvar[this.params.var_id_field].split('_')[0] == chain.body[i][this.params.var_id_field].split('_')[0] ? 1:0
	    isref = chain.header.ldrefvar[this.params.var_id_field] == chain.body[i][this.params.var_id_field] ? 1:0
	} else {
	    d = lookup[chain.body[i][this.params.var_id_field]]
	    isref = chain.header.ldrefvar[this.params.var_id_field] == chain.body[i][this.params.var_id_field]? 1:0
	}
	
        if( d != null ) {
            chain.body[i][ld_field] = d.r2;
            chain.body[i][reffield] = isref
        }

        if(isref==1) {
            chain.body[i][ld_field] = 1
            chain.body[i][reffield] = isref
        }
    };

    return { header: chain.header, body:chain.body}

}

LocusZoom.Data.FG_LDDataSource.prototype.fetchRequest = function(state, chain, fields) {
    var url = this.getURL(state, chain, fields);
    var headers = {
        "Content-Type": "application/json"
    };
    
    return url ? LocusZoom.createCORSPromise("GET", url, {}, headers) : Q.defer()

};

export const init_locus_zoom = () => {
    // Define LocusZoom Data Sources object
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();

    var recomb_source = window.genome_build == 37 ? 15 : 16
    var gene_source = window.genome_build == 37 ? 2 : 1
    //data_sources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])
    data_sources.add("assoc", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    
    if (window.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "/api/ld",
								   params: { id:[1,4] ,
									     pvalue_field: "assoc:pvalue",
									     "var_id_field":"assoc:id" }}));
    } else {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/",
								   params: { id:[1,4] ,pvalue_field: "assoc:pvalue",
									     "var_id_field":"assoc:rsid" }}));
    }
    data_sources.add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", params: {source: recomb_source} }]);

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
	if (pScaled > window.vis_conf.loglog_threshold) {
	    pScaled = window.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(window.vis_conf.loglog_threshold)
	}
	return pScaled
    })
    
    // dashboard components
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

    window.debug.data_sources = data_sources;
    window.plot = LocusZoom.populate("#lz-1", data_sources, region_layout);
    window.plot.addPanel(panel_layouts.assoc);
};

export const init_locus_zoom_1 = (region) => {
    // Define LocusZoom Data Sources object
    window.pheno = region.pheno
    window.lz_conf = region.lz_conf
    window.genome_build = region.genome_build
    window.vis_conf = vis_conf
    
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var localCondBase = "/api/conditional_region/" + window.pheno.phenocode + "/lz-";
    var localFMBase = "/api/finemapped_region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();

    var gene_source = window.genome_build == 37 ? 2 : 1
    var recomb_source = window.genome_build == 37 ? 15 : 16
    var gwascat_source = window.genome_build == 37 ? [2,3] : [1,4]
    
    data_sources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    data_sources.add("conditional", ["ConditionalLZ", {url: localCondBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    data_sources.add("finemapping", ["FineMappingLZ", {url: localFMBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    data_sources.add("gene", ["GeneLZ", {url:remoteBase + "annotation/genes/", params:{source:gene_source}}])
    data_sources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])
    // clinvar needs to be added after gene because genes within locuszoom data chain are used for fetching
    data_sources.add("gwas_cat", new LocusZoom.Data.GWASCatSource({url: remoteBase + "annotation/gwascatalog/", params: { id:gwascat_source ,pvalue_field: "log_pvalue" }}));
    data_sources.add("clinvar", new LocusZoom.Data.ClinvarDataSource({url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/", params: { id:[1,4] ,pvalue_field: "log_pvalue" }}));
    if (window.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "/api/ld", params: { id:[1,4] ,pvalue_field: "association:pvalue", "var_id_field":"association:id" }}));
    } else {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/", params: { id:[1,4] ,pvalue_field: "association:pvalue", "var_id_field":"association:rsid" }}));
    }	
    data_sources.add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", params: {source: recomb_source} }]);

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
	if (pScaled > window.vis_conf.loglog_threshold) {
	    pScaled = window.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(window.vis_conf.loglog_threshold)
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
        
    window.debug.data_sources = data_sources;
    //window.debug.layout = layout;
    //window.debug.assoc_data_layer = layout.panels[0].data_layers[2];

    window.show_conditional = function(index) {
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

    window.show_finemapping = function(method) {
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

    window.update_mouseover = function(key) {
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
};
