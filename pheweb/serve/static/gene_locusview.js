'use strict';

// DEPENDENCIES: This js depends on custom_locuszoom.js, which need to be included first in html files. We are moving to webpack to take care of the dependencies and this documentation is
// an interim reminder

(function() {
    // Define LocusZoom Data Sources object
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();
    data_sources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    data_sources.add("gwas_cat", new LocusZoom.Data.GWASCatSource({url: remoteBase + "annotation/gwascatalog/", params: { id:[1,4] ,pvalue_field: "log_pvalue" }}));
    data_sources.add("gene", ["GeneLZ", {url:remoteBase + "annotation/genes/", params:{source:1}}])
    data_sources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])
    // clinvar needs to be added after gene because genes within locuszoom data chain are used for fetching
    data_sources.add("clinvar", new LocusZoom.Data.ClinvarDataSource({url: "/api/ncbi/", params: { id:[1,4] ,pvalue_field: "log_pvalue" }}));
    if (window.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "/api/ld", params: { id:[1,4] ,pvalue_field: "association:pvalue", "var_id_field":"association:id" }}));
    } else {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/", params: { id:[1,4] ,pvalue_field: "pvalue", "var_id_field":"rsid" }}));
    }	

    LocusZoom.TransformationFunctions.set("neglog10_or_100", function(x) {
        if (x === 0) return 100;
        var log = -Math.log(x) / Math.LN10;
        return log;
    });

    LocusZoom.TransformationFunctions.set("log_pvalue", function(x) {
        return x
    });

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

    // TODO: copying the whole layout was a bad choice.
    //       I should just have copied the standard and adjusted it like in variant.js
    //       That makes it more clear when I've changed things from the default.
    //       It means that I often have to change my code when the default changes,
    //       But I already usually have to make changes when the default changes, and they'd be easier.
    var layout = {
        width: 800,
        height: 400,
        "min_width": 800,
        "min_height": 400,
        responsive_resize: 'both',
        "resizable": "responsive",
        // aspect_ratio: 2, // do I want this?
        "min_region_scale": 2e4,
        "max_region_scale": 5e5,
        "panel_boundaries": true,
        mouse_guide: true,

        "dashboard": {
            "components": [
            {
                type: 'link',
                title: 'Go to Manhattan Plot',
                text:' Manhattan Plot',
                url: '/pheno/' + window.pheno.phenocode
            },
            {
                type: 'move',
                text: '<<',
                title: 'Shift view 1/4 to the left',
                direction: -0.75,
                group_position: "start",
            },
            {
                type: 'move',
                text: '<',
                title: 'Shift view 1/4 to the left',
                direction: -0.25,
                group_position: "middle",
            },
            {
                type: 'zoom_region',
                button_html: 'z+',
                title: 'zoom in 2x',
                step: -0.5,
                group_position: "middle",
            },
            {
                type: 'zoom_region',
                button_html: 'z-',
                title: 'zoom out 2x',
                step: 1,
                group_position: "middle",
            },
            {
                type: 'move',
                text: '>',
                title: 'Shift view 1/4 to the right',
                direction: 0.25,
                group_position: "middle",
            },
            {
                type: 'move',
                text: '>>',
                title: 'Shift view 3/4 to the right',
                direction: 0.75,
                group_position: "end",
            },
            {
                "type": "download",
                "position": "right",
            }
            ]
        },
        "panels": [
          {
            "id": "association",
            "title": { "text":window.browser, "x":55, "y":30 } ,
            "proportional_height": 0.3,
            "min_width": 400,
            "min_height": 100,
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
                "origin": {
                    "x": 55,
                    "y": 40
                },
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
            "data_layers": [{
                "id": "significance",
                type: "orthogonal_line",
                orientation: "horizontal",
                offset: -Math.log10(5e-8),
            }, {
                "namespace": {
                    "default": "",
                    "ld": "ld"
                },
                "id": "associationpvalues",
                "type": "scatter",
                "point_shape": {
                    "scale_function": "if",
                    "field": "ld:isrefvar",
                    "parameters": {
                        "field_value": 1,
                        "then": "diamond",
                        "else": "circle"
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
                        "breaks": [0, 0.2, 0.4, 0.6, 0.8],
                        "values": ["#357ebd", "#46b8da", "#5cb85c", "#eea236", "#d43f3a"]
                    }
                }, "#B8B8B8"],
                fill_opacity: 0.7,
                "legend": [{
                    "shape": "diamond",
                    "color": "#9632b8",
                    "size": 40,
                    "label": "LD Ref Var",
                    "class": "lz-data_layer-scatter"
                }, {
                    "shape": "circle",
                    "color": "#d43f3a",
                    "size": 40,
                    "label": "1.0 > r² ≥ 0.8",
                    "class": "lz-data_layer-scatter"
                }, {
                    "shape": "circle",
                    "color": "#eea236",
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
                    "label": "0.2 > r² ≥ 0.0",
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
                    onmouseout: [{action: "unset", status:"selected"}],
                    onclick: [{action: "link", href:"/variant/{{association:chr}}-{{association:position}}-{{association:ref}}-{{association:alt}}"}],
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
		    "field" : "association:mlogp",
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
        },
          {
            "id": "gwas_catalog",
            "title": { "text":"GWAS catalog + UKBB", "x":55, "y":30 },
            "y_index": 2,
            "proportional_height": 0.2,
            "min_width": 400,
            "min_height": 100,
            "margin": {
                "top": 10,
                "right": 50,
                "bottom": 20,
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
                "origin": {
                    "x": 55,
                    "y": 40
                },
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
            "data_layers": [ {
                "namespace": {
                    "gwas_cat":"gwas_cat"
                },
                "id": "gwas_cat:id",
                "type": "scatter",
                "point_shape": {
                    "scale_function": "if",
                    "field": "gwas_cat:study",
                    "parameters": {
                        "field_value": "UKBB",
                        "then": "circle",
                        "else":"diamond"
                    }
                },
                "color": {
                    "scale_function": "if",
                    "field": "gwas_cat:study",
                    "parameters": {
                        "field_value": "UKBB",
                        "then": "#9632b8",
                        "else":"#d43f3a"
                    }
                },
                fill_opacity: 0.7,
                "legend": [{
                    "shape": "circle",
                    "color": "#9632b8",
                    "size": 40,
                    "label": "UKBB",
                    "class": "lz-data_layer-scatter"
                }, {
                    "shape": "diamond",
                    "color": "#d43f3a",
                    "size": 40,
                    "label": "GWAS catalog",
                    "class": "lz-data_layer-scatter"
                },],

                fields: ["gwas_cat:id", "gwas_cat:or_beta","gwas_cat:pmid","gwas_cat:variant","gwas_cat:chrom", "gwas_cat:risk_allele", "gwas_cat:risk_frq","gwas_cat:pos", "gwas_cat:ref", "gwas_cat:alt","gwas_cat:trait","gwas_cat:study", "gwas_cat:log_pvalue"],

                id_field: "gwas_cat:variant",
                behaviors: {
                    onmouseover: [{action: "set", status:"selected"}],
                    onmouseout: [{action: "unset", status:"selected"}],
                    onclick: [{action: "link", href:"https://www.ncbi.nlm.nih.gov/pubmed/{{gwas_cat:pmid}}",target: "_blank"}],

                },
                tooltip: {
                    closable: false,
                    "show": {
                        "or": ["highlighted", "selected"]
                    },
                    "hide": {
                        "and": ["unhighlighted", "unselected"]
                    },
                    html: 'Variant:<strong>{{gwas_cat:variant}}</strong><br>\n\nTrait:<strong>{{gwas_cat:trait}}</strong><br>\n\neffect size:<strong>{{gwas_cat:or_beta}}</strong><br>\n\nLog-pval:<strong>{{gwas_cat:log_pvalue}}</strong><br>\n\nRisk allele:<strong>{{gwas_cat:risk_allele}}</strong><br>\n\nRisk allele frq:<strong>{{gwas_cat:risk_frq}}</strong><br>\n\nStudy:<strong>{{gwas_cat:study}}</strong><br>'
                },

                "x_axis": {
                    "field": "gwas_cat:pos",
                    "axis": 1
                },
                "y_axis": {
                    "axis": 1,
                    "field": "gwas_cat:log_pvalue",
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
        },
          {
            "id": "genes",
            "proportional_height": 0.5,
            "min_width": 400,
            "y_index": 1,
            "min_height": 100,
            "margin": {
                "top": 0,
                "right": 50,
                "bottom": 0,
                "left": 50
            },
            "axes": {
                "x": {"render": false},
                "y1": {"render": false},
                "y2": {"render": false}
            },
            "interaction": {
                "drag_background_to_pan": true,
                "scroll_to_zoom": true,
                "x_linked": true,
                "drag_x_ticks_to_scale": false,
                "drag_y1_ticks_to_scale": false,
                "drag_y2_ticks_to_scale": false,
                "y1_linked": false,
                "y2_linked": false
            },
            "dashboard": {
                "components": [{
                    "type": "resize_to_data",
                    "position": "right",
                    "color": "blue"
                }]
            },
            "data_layers": [{
                "namespace": {
                    "gene": "gene",
                    // "constraint": "constraint"
                },
                "id": "genes",
                "type": "genes",
                "fields": ["gene:gene"],
                "id_field": "gene_id",
                "highlighted": {
                    "onmouseover": "on",
                    "onmouseout": "off"
                },
                "selected": {
                    "onclick": "toggle_exclusive",
                    "onshiftclick": "toggle"
                },
                "transition": false,
                behaviors: {
                    onclick: [{action: "toggle", status: "selected", exclusive: true}],
                    onmouseover: [{action: "set", status: "highlighted"}],
                    onmouseout: [{action: "unset", status: "highlighted"}],
                },
                "tooltip": {
                    "closable": true,
                    "show": {
                        "or": ["highlighted", "selected"]
                    },
                    "hide": {
                        "and": ["unhighlighted", "unselected"]
                    },
                    "html": "<h4><strong><i>{{gene_name}}</i></strong></h4><div>Gene ID: <strong>{{gene_id}}</strong></div><div>Transcript ID: <strong>{{transcript_id}}</strong></div><div style=\"clear: both;\"></div><table width=\"100%\"><tr><td style=\"text-align: right;\"><a href=\"http://exac.broadinstitute.org/gene/{{gene_id}}\" target=\"_new\">More data on ExAC</a></td></tr></table>"
                    // "html": "<h4><strong><i>{{gene_name}}</i></strong></h4><div style=\"float: left;\">Gene ID: <strong>{{gene_id}}</strong></div><div style=\"float: right;\">Transcript ID: <strong>{{transcript_id}}</strong></div><div style=\"clear: both;\"></div><table><tr><th>Constraint</th><th>Expected variants</th><th>Observed variants</th><th>Const. Metric</th></tr><tr><td>Synonymous</td><td>{{exp_syn}}</td><td>{{n_syn}}</td><td>z = {{syn_z}}</td></tr><tr><td>Missense</td><td>{{exp_mis}}</td><td>{{n_mis}}</td><td>z = {{mis_z}}</td></tr><tr><td>LoF</td><td>{{exp_lof}}</td><td>{{n_lof}}</td><td>pLI = {{pLI}}</td></tr></table><table width=\"100%\"><tr><td><button onclick=\"LocusZoom.getToolTipPlot(this).panel_ids_by_y_index.forEach(function(panel){ if(panel == 'genes'){ return; } var filters = (panel.indexOf('intervals') != -1 ? [['intervals:start','>=','{{start}}'],['intervals:end','<=','{{end}}']] : [['position','>','{{start}}'],['position','<','{{end}}']]); LocusZoom.getToolTipPlot(this).panels[panel].undimElementsByFilters(filters, true); }.bind(this)); LocusZoom.getToolTipPanel(this).data_layers.genes.unselectAllElements();\">Identify data in region</button></td><td style=\"text-align: right;\"><a href=\"http://exac.broadinstitute.org/gene/{{gene_id}}\" target=\"_new\">More data on ExAC</a></td></tr></table>"
                },
                "label_font_size": 12,
                "label_exon_spacing": 3,
                "exon_height": 8,
                "bounding_box_padding": 5,
                "track_vertical_spacing": 5,
                "hover_element": "bounding_box",
                "x_axis": {
                    "axis": 1
                },
                "y_axis": {
                    "axis": 1
                },

            }
          ],
            "title": null,
            "description": null,
            "origin": {
                "x": 0,
                "y": 225
            },
            "proportional_origin": {
                "x": 0,
                "y": 0.5
            },
            "background_click": "clear_selections",
            "legend": null
        }
      ]
    }

    var clinvar_panel = {
        "id": "clinvar",
        "title": { "text":"", "x":55, "y":35, "style":{ "font-size":6} },
        "y_index": 2,
        "min_width": 400,
        "min_height": 45,
        "proportional_height": 0.05,
        "margin": {
            "top": 0,
            "right": 50,
            "bottom": 0,
            "left": 50
        },
        "axes": {
            "x": {
                "label_function": "chromosome",
                "label_offset": 32,
                "tick_format": "region",
                "extent": "state",
                "render": false,
                "label": "Chromosome {{chr}} (Mb)"
            },
            "y1": {
                "label": "Clinvar",
                "label_offset": 28,
                "render": true,
                "ticks": [],
                "label_function": null
            }
        },
        "legend": {
            "orientation": "vertical",
            "origin": {
                "x": 55,
                "y": 40
            },
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
        "data_layers": [ {
            "namespace": {
                "clinvar":"clinvar"
            },
            "id": "clinvar:var",
            "type": "scatter",
            "point_shape": "diamond",
            "point_size": {
                "scale_function": "if",
                "field": "ld:isrefvar",
                "parameters": {
                    "field_value": 1,
                    "then": 80,
                    "else": 40
                }
            },

            "color": "#FF0000" ,
            fill_opacity: 0.7,

            fields: ["clinvar:id","clinvar:trait","clinvar:clinical_sig","clinvar:varName","clinvar:chr",
                    "clinvar:ref","clinvar:alt","clinvar:start","clinvar:stop","clinvar:y"],
            id_field: "id",
            behaviors: {
                onmouseover: [{action: "set", status:"selected"}],
                onmouseout: [{action: "unset", status:"selected"}],
                onclick: [{action: "link", href:"https://www.ncbi.nlm.nih.gov/clinvar/variation/{{id}}",target: "_blank"}],

            },
            tooltip: {
                closable: false,
                "show": {
                    "or": ["highlighted", "selected"]
                },
                "hide": {
                    "and": ["unhighlighted", "unselected"]
                },
                html: "<h4><strong><i>{{clinvar:trait}}</i></strong></h4><div>variant: <strong>{{varName}}</strong></div><div>Significance: <strong>{{clinical_sig}}</strong></div>"
            },

            "x_axis": {
                "field": "clinvar:start",
                "axis": 1
            },
            "y_axis": {
                "axis": 1,
                "field": "clinvar:y",
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

    window.debug.data_sources = data_sources;
    window.debug.layout = layout;
    window.debug.assoc_data_layer = layout.panels[0].data_layers[2];

    layout.panels.push(clinvar_panel)

    $(function() {

        // Populate the div with a LocusZoom plot using the default layout
        window.plot = LocusZoom.populate("#lz-1", data_sources, layout);

        Object.values(window.plot.panels).forEach( function(panel, index) {
            panel.on("data_rendered", function(){

                panel.scaleHeightToData()
                if (typeof(panel.parent_plot.scaleHeightToData) == "function") {
                        panel.parent_plot.scaleHeightToData()
                }

                if( index == Object.values(window.plot.panels).length-1) {
                    //window.plot.panels.genes.scaleHeightToData()
                }
            })
        })


        //window.plot.panels.genes.on("data_rendered", function(){
            // gene panel takes extra space. After data is rendered scale the height to data
        //    this.scaleHeightToData()
    //        gene_panel.scaleHeightToData()
    //    });


    });
})();
