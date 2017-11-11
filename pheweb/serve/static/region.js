'use strict';

LocusZoom.Data.AssociationSource.prototype.parseArraysToObjects = function(x, fields, outnames, trans) {
    // This overrides the default to keep all fields in `x` (the response)
    // If <https://github.com/statgen/locuszoom/pull/102> gets accepted, it won't be necessary.

    //intended for an object of arrays
    //{"id":[1,2], "val":[5,10]}
    if (Object.keys(x).length === 0) {
        throw "The association source sent back no data for this region.";
    }
    var records = [];
    fields.forEach(function(f, i) {
        if (!(f in x)) {throw "field " + f + " not found in response for " + outnames[i];}
    });
    var x_keys = Object.keys(x);
    var N = x[x_keys[0]].length; // NOTE: this was [1] before, why?
    x_keys.forEach(function(key) {
        if (x[key].length !== N) {
            throw "the response column " + key + " had " + x[key].length.toString() +
                " elements but " + x_keys[0] + " had " + N.toString();
        }
    });
    var nonfield_keys = x_keys.filter(function(key) {
        return fields.indexOf(key) === -1;
    });
    for(var i = 0; i < N; i++) {
        var record = {};
        for(var j=0; j<fields.length; j++) {
            var val = x[fields[j]][i];
            if (trans && trans[j]) {
                val = trans[j](val);
            }
            record[outnames[j]] = val;
        }
        for(var j=0; j<nonfield_keys.length; j++) {
            record[nonfield_keys[j]] = x[nonfield_keys[j]][i];
        }
        records.push(record);
    }
    return records;
};

LocusZoom.TransformationFunctions.set("percent", function(x) {
    if (x === 1) { return "100%"; }
    var x = (x*100).toPrecision(2);
    if (x.indexOf('.') !== -1) { x = x.replace(/0+$/, ''); }
    if (x.endsWith('.')) { x = x.substr(0, x.length-1); }
    return x + '%';
});


// monkeypatch to handle `NaN` in response.
LocusZoom.Data.LDSource.prototype.parseResponse = function(resp, chain, fields, outnames) {
    try {
        var json = JSON.parse(resp);
    } catch (exc) {
        if (exc instanceof SyntaxError) {
            resp = resp.replace(/\bNaN\b/g, 'null');
            var junk = JSON.parse(resp);
            var json = { data:{} };
            Object.keys(junk).forEach(function(key) {
                if (key != 'data') { json[key] = junk[key]; }
            });
            var json_data_keys = Object.keys(junk.data);
            json_data_keys.forEach(function(key) {
                json.data[key] = [];
            });
            for (var i=0; i<junk.data.rsquare.length; i++) {
                if (junk.data.rsquare[i] !== null) {
                    json_data_keys.forEach(function(key) {
                        json.data[key].push(junk.data[key][i]);
                    });
                }
            }
        } else {
            console.log('caught and rethrowing', exc);
            throw exc;
        }
    }
    var keys = this.findMergeFields(chain);
    var reqFields = this.findRequestedFields(fields, outnames);
    if (!keys.position) {
        throw("Unable to find position field for merge: " + keys._names_);
    }
    var leftJoin = function(left, right, lfield, rfield) {
        var i=0, j=0;
        while (i < left.length && j < right.position2.length) {
            if (left[i][keys.position] == right.position2[j]) {
                left[i][lfield] = right[rfield][j];
                i++;
                j++;
            } else if (left[i][keys.position] < right.position2[j]) {
                i++;
            } else {
                j++;
            }
        }
    };
    var tagRefVariant = function(data, refvar, idfield, outname) {
        for(var i=0; i<data.length; i++) {
            if (data[i][idfield] && data[i][idfield]===refvar) {
                data[i][outname] = 1;
            } else {
                data[i][outname] = 0;
            }
        }
    };
    leftJoin(chain.body, json.data, reqFields.ldout, "rsquare");
    if(reqFields.isrefvarin && chain.header.ldrefvar) {
        tagRefVariant(chain.body, chain.header.ldrefvar, keys.id, reqFields.isrefvarout);
    }
    return chain;   
};

(function() {
    // Define LocusZoom Data Sources object
    var localBase = window.model.urlprefix + "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();
    data_sources.add("base", ["AssociationLZ", localBase]);
    data_sources.add("ld", ["LDLZ", {url: remoteBase + "pair/LD/", params: { pvalue_field: "pvalue|neglog10_or_100" }}]);
    data_sources.add("gene", ["GeneLZ", { url: remoteBase + "annotation/genes/", params: {source: 2} }]);
    data_sources.add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", params: {source: 15} }])

    LocusZoom.TransformationFunctions.set("neglog10_or_100", function(x) {
        if (x === 0) return 100;
        var log = -Math.log(x) / Math.LN10;
        return log;
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

    LocusZoom.Dashboard.Components.add("ldrefsource_selector", function(layout){
        LocusZoom.Dashboard.Component.apply(this, arguments);
        this.initialize = function(){
            this.parent_plot.state.ldrefsource = 1;
        }

        this.update = function() {
            if (this.button){ return this; }

            this.button = new LocusZoom.Dashboard.Component.Button(this);
            this.button
                .setText("LD source: 1000G ALL")
                .setTitle("click to switch to next LD source")
                .setOnclick(function(){
                    if (this.parent_plot.state.ldrefsource == 1) {
                        this.parent_plot.state.ldrefsource = 2;
                        this.button.setText('LD source: 1000G EUR');
                    } else {
                        this.parent_plot.state.ldrefsource = 1;
                        this.button.setText('LD source: 1000G ALL');
                    }
                    this.button.show();
                    this.parent_plot.applyState({});
                }.bind(this));
            this.button.show();
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
        responsive_resize: true,
        "resizable": "responsive",
        // aspect_ratio: 2, // do I want this?
        "min_region_scale": 2e4,
        "max_region_scale": 5e5,
        "panel_boundaries": true,
        mouse_guide: true,

        "dashboard": {
            "components": [{
                type: 'link',
                title: 'Go to Manhattan Plot',
                text:' Manhattan Plot',
                url: window.model.urlprefix + '/pheno/' + window.pheno.phenocode
            },{
                type: 'move',
                text: '<<',
                title: 'Shift view 1/4 to the left',
                direction: -0.75,
                group_position: "start",
            },{
                type: 'move',
                text: '<',
                title: 'Shift view 1/4 to the left',
                direction: -0.25,
                group_position: "middle",
            },{
                type: 'zoom_region',
                button_html: 'z+',
                title: 'zoom in 2x',
                step: -0.5,
                group_position: "middle",
            },{
                type: 'zoom_region',
                button_html: 'z-',
                title: 'zoom out 2x',
                step: 1,
                group_position: "middle",
            },{
                type: 'move',
                text: '>',
                title: 'Shift view 1/4 to the right',
                direction: 0.25,
                group_position: "middle",
            },{
                type: 'move',
                text: '>>',
                title: 'Shift view 3/4 to the right',
                direction: 0.75,
                group_position: "end",
            },{
                "type": "download",
                "position": "right",
            },{
                "type": "ldrefsource_selector",
                "position": "right",
            }]
        },
        "panels": [{
            "id": "association",
            "title": "",
            "proportional_height": 0.5,
            "min_width": 400,
            "min_height": 100,
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
                "id": "significance",
                type: "orthogonal_line",
                orientation: "horizontal",
                offset: -Math.log10(5e-8),
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

                fields: ["id", "chr", "position", "ref", "alt", "pvalue", "pvalue|neglog10_or_100", "ld:state", "ld:isrefvar"],
                // ldrefvar can only be chosen if "pvalue|neglog10_or_100" is present.  I forget why.
                id_field: "id",
                behaviors: {
                    onmouseover: [{action: "set", status:"selected"}],
                    onmouseout: [{action: "unset", status:"selected"}],
                    onclick: [{action: "link", href:window.model.urlprefix+"/variant/{{chr}}-{{position}}-{{ref}}-{{alt}}"}],
                },
                tooltip: {
                    closable: false,
                    "show": {
                        "or": ["highlighted", "selected"]
                    },
                    "hide": {
                        "and": ["unhighlighted", "unselected"]
                    },
                    html: '<strong>{{id}}</strong><br>\n\n' + window.model.tooltip_lztemplate
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
                "top": 17,
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
    window.debug.assoc_data_layer = layout.panels[0].data_layers[2];

    $(function() {
        // Populate the div with a LocusZoom plot using the default layout
        window.plot = LocusZoom.populate("#lz-1", data_sources, layout);
    });
})();
