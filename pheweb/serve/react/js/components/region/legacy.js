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

const association_layout = (region) => { return {
    "id": "association",
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
	 "default": "association",
	 "ld": "ld" },
       "id": "associationpvalues",
       "type": "scatter",
       "point_shape": {
	   "scale_function": "categorical_bin",
	   "field": "association:most_severe",
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
	   "field": "association:most_severe",
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
       fields: ["association:id", "association:chr", "association:position", "association:ref", "association:alt", "association:pvalue", "association:pvalue|neglog10_or_100", "association:beta", "association:sebeta", "association:rsid", "association:maf", "association:maf_cases", "association:maf_controls", "association:most_severe", "association:fin_enrichment", "association:INFO", "ld:state", "ld:isrefvar"],
       // ldrefvar can only be chosen if "pvalue|neglog10_or_100" is present.  I forget why.
       id_field: "association:id",
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
	   "field": "association:position",
	   "axis": 1
       },
       "y_axis": {
	   "axis": 1,
	   "field": "association:pvalue|neglog10_or_100",
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
    "background_click": "clear_selections"
};
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
	return this.url + "?variant=" + topvar['association:chr'] + ':' + topvar['association:position'] + ':' + topvar['association:ref'] + ':' + topvar['association:alt'] + "&window=" + windowSize + "&panel=sisu3"
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

export const init_locus_zoom = (region) => {
    // Define LocusZoom Data Sources object
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();

    var recomb_source = window.genome_build == 37 ? 15 : 16
    var gene_source = window.genome_build == 37 ? 2 : 1
    //data_sources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])
    data_sources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    
    if (window.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "/api/ld",
								   params: { id:[1,4] ,
									     pvalue_field: "association:pvalue",
									     "var_id_field":"association:id" }}));
    } else {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/",
								   params: { id:[1,4] ,pvalue_field: "association:pvalue",
									     "var_id_field":"association:rsid" }}));
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
    window.plot.addPanel(association_layout(region));
};
