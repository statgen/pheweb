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

(function() {
    // Define LocusZoom Data Sources object
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();
    data_sources.add("base", ["AssociationLZ", localBase]);
    data_sources.add("ld", ["LDLZ", {url: remoteBase + "pair/LD/", params: { pvalue_field: "pvalue|neglog10_or_100" }}]);
    
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
                url: '/pheno/' + window.pheno.phenocode
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

                fields: ["id", "chr", "position", "ref", "alt", "pvalue", "pvalue|neglog10_or_100", "ld:state", "ld:isrefvar"],
                // ldrefvar can only be chosen if "pvalue|neglog10_or_100" is present.  I forget why.
                id_field: "id",
                behaviors: {
                    onmouseover: [{action: "set", status:"selected"}],
                    onmouseout: [{action: "unset", status:"selected"}],
                    onclick: [{action: "link", href:"/variant/{{chr}}-{{position}}-{{ref}}-{{alt}}"}],
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
