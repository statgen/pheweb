window.debug = window.debug || {};

(function() {
    // Define LocusZoom Data Sources object
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "http://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();
    data_sources.add("base", ["AssociationLZ", localBase]);
    data_sources.add("ld", ["LDLZ", {url: remoteBase + "pair/LD/", params: { pvalue_field: "pvalue|neglog10_or_100" }}]);
    data_sources.add("gene", ["GeneLZ", { url: remoteBase + "annotation/genes/", params: {source: 2} }]);
    data_sources.add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", params: {source: 15} }])
    data_sources.add("sig", ["StaticJSON", [{ "x": 0, "y": 7.3 }, { "x": 2881033286, "y": 7.3 }] ])

    LocusZoom.TransformationFunctions.set("neglog10_or_100", function(x) {
        if (x === 0) return 100;
        var log = -Math.log(x) / Math.LN10;
        return log;
    });

    LocusZoom.TransformationFunctions.add("scinotation_handle_zero", function(x) {
        if (x === 0) return "zero";
        var log;
        if (Math.abs(x) > 1){
            log = Math.ceil(Math.log(x) / Math.LN10);
        } else {
            log = Math.floor(Math.log(x) / Math.LN10);
        }
        if (Math.abs(log) <= 3){
            return x.toFixed(3);
        } else {
            return x.toExponential(2).replace("+", "").replace("e", " × 10^");
        }
    });


    var layout = {
        width: 800,
        height: 400,
        "min_width": 800,
        "min_height": 400,
        responsive_resize: true, // is this supposed to be here?
        "resizable": "responsive",
        // aspect_ratio: 2, // do I want this?
        "min_region_scale": 2e4,
        "max_region_scale": 5e5,
        "panel_boundaries": true,

        "dashboard": {
            "components": [{
                "type": "download",
                "position": "right",
                "color": "gray"
            }]
        },
        "panels": [{
            "id": "association",
            "title": "",
            "proportional_height": 0.5,
            "min_width": 400,
            "min_height": 100,
            "margin": {
                "top": 35,
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
                    "label": null
                },
                "y1": {
                    "label": "-log10 p-value",
                    "label_offset": 28,
                    "render": true,
                    "label_function": null
                },
                "y2": {
                    "label": "Recombination Rate (cM/Mb)",
                    "label_offset": 40,
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
                "namespace": {
                    "sig": "sig"
                },
                "id": "significance",
                "type": "line",
                "fields": ["sig:x", "sig:y"],
                "z_index": 0,
                "style": {
                    "stroke": "#D3D3D3",
                    "stroke-width": "3px",
                    "stroke-dasharray": "10px 10px",
                    "fill": "none"
                },
                "x_axis": {
                    "field": "sig:x",
                    "decoupled": true,
                    "axis": 1
                },
                "y_axis": {
                    "axis": 1,
                    "field": "sig:y"
                },
                "interpolate": "linear",
                "hitarea_width": 5
            }, {
                "namespace": {
                    "recomb": "recomb"
                },
                "id": "recombrate",
                "type": "line",
                "fields": ["recomb:position", "recomb:recomb_rate"],
                "z_index": 1,
                "style": {
                    "stroke": "#0000FF",
                    "stroke-width": "1.5px",
                    "fill": "none"
                },
                "x_axis": {
                    "field": "recomb:position",
                    "axis": 1
                },
                "y_axis": {
                    "axis": 2,
                    "field": "recomb:recomb_rate",
                    "floor": 0,
                    "ceiling": 100
                },
                "transition": false,
                "interpolate": "linear",
                "hitarea_width": 5
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

                fields: ["id", "chr", "position", "ref", "alt", "rsid", "pvalue|scinotation_handle_zero", "pvalue|neglog10_or_100", "maf", "ld:state", "ld:isrefvar"],
                id_field: "id",
                behaviors: {
                    onmouseover: [{action: "set", status:"selected"}],
                    onmouseout: [{action: "unset", status:"selected"}],
                    onclick: [{action: "link", href:"/variant/{{chr}}-{{position}}-{{ref}}-{{alt}}"}],
                },
                tooltip: {
                    "closable": true,
                    "show": {
                        "or": ["highlighted", "selected"]
                    },
                    "hide": {
                        "and": ["unhighlighted", "unselected"]
                    },
                    html: "<strong>{{id}}</strong><br>" +
                        "<strong>{{rsid}}</strong><br>" +
                        "P-value: <strong>{{pvalue|scinotation_handle_zero}}</strong><br>" +
                        "MAF: <strong>{{maf}}</strong><br>"
                },
                "z_index": 2,
                "x_axis": {
                    "field": "position",
                    "axis": 1
                },
                "y_axis": {
                    "axis": 1,
                    "field": "pvalue|neglog10_or_100",
                    "floor": 0,
                    "upper_buffer": 0.1,
                    "min_extent": [0, 10]
                },
                "transition": false,
            }],
            "description": null,
            "y_index": 0,
            "origin": {
                "x": 0,
                "y": 0
            },
            "proportional_origin": {
                "x": 0,
                "y": 0
            },
            "background_click": "clear_selections",
        }, {
            "id": "genes",
            "proportional_height": 0.5,
            "min_width": 400,
            "min_height": 100,
            "margin": {
                "top": 20,
                "right": 50,
                "bottom": 20,
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
                "z_index": 0
            }],
            "title": null,
            "description": null,
            "y_index": 1,
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
        }]
    }

    window.debug.data_sources = data_sources;
    window.debug.layout = layout;
    $(function() {
        // Populate the div with a LocusZoom plot using the default layout
        window.plot = LocusZoom.populate("#lz-1", data_sources, layout);

        $('#move-left').on('click', function() { move(-0.5); });
        $('#move-left-fast').on('click', function() { move(-1.5); });
        $('#move-right').on('click', function() { move(0.5); });
        $('#move-right-fast').on('click', function() { move(1.5); });
        $('#zoom-out').on('click', function() { zoom(2); });
        $('#zoom-in').on('click', function() { zoom(0.5); });
    });

    function move(direction) {
        // 1 means right, -1 means left.
        var start = window.plot.state.start;
        var end = window.plot.state.end;
        var shift = Math.floor((end - start) / 2) * direction;
        window.plot.applyState({
            chr: window.plot.state.chr,
            start: start + shift,
            end: end + shift
        });
    }

    function zoom(growth_factor){
        // 2 means bigger view, 0.5 means zoom in.
        growth_factor = parseFloat(growth_factor);
        var delta = (plot.state.end - plot.state.start) * (growth_factor - 1) / 2;
        var new_start = Math.max(Math.round(plot.state.start - delta), 1);
        var new_end   = Math.round(plot.state.end + delta);
        if (new_start == new_end){ new_end++; }
        var new_state = {
            start: new_start,
            end: new_end
        };
        if (new_state.end - new_state.start > plot.layout.max_region_scale){
            delta = Math.round(((new_state.end - new_state.start) - plot.layout.max_region_scale) / 2);
            new_state.start += delta;
            new_state.end -= delta;
        }
        if (new_state.end - new_state.start < plot.layout.min_region_scale){
            delta = Math.round((plot.layout.min_region_scale - (new_state.end - new_state.start)) / 2);
            new_state.start -= delta;
            new_state.end += delta;
        }
        plot.applyState(new_state);
    }

})();
