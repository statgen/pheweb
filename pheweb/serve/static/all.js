'use strict';

(function() {
    // Define LocusZoom Data Sources object
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();

    var recomb_source = window.genome_build == 37 ? 15 : 16
    
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
    $(function() {
        window.plot = LocusZoom.populate("#lz-1", data_sources, window.region_layout);
	window.plot.addPanel(window.panel_layouts.association)
    });

})();

// TODO: copying the whole layout was a bad choice.
//       I should just have copied the standard and adjusted it like in variant.js
//       That makes it more clear when I've changed things from the default.
//       It means that I often have to change my code when the default changes,
//       But I already usually have to make changes when the default changes, and they'd be easier.
window.region_layout = {

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

window.panel_layouts = {}

window.panel_layouts.association = {
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
       fields: window.lz_conf.assoc_fields,
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
    "background_click": "clear_selections",
}

