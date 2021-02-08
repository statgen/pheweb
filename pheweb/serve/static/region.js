'use strict';

LocusZoom.KnownDataSources.extend("AssociationLZ", "AssociationPheWeb", {
    getURL: function (state, chain, fields) {
        return this.url + "results/?filter=chromosome in  '" + state.chr + "'" +
            " and position ge " + state.start +
            " and position le " + state.end;
    },
    // Although the layout fields array is useful for specifying transforms, this source will magically re-add
    //  any data that was not explicitly requested
    extractFields: function(data, fields, outnames, trans) {
        // The field "all" has a special meaning, and only exists to trigger a request to this source.
        // We're not actually trying to request a field by that name.
        var has_all = fields.indexOf("all");
        if (has_all !== -1) {
            fields.splice(has_all, 1);
            outnames.splice(has_all, 1);
            trans.splice(has_all, 1);
        }
        // Find all fields that have not been requested (sans transforms), and add them back to the fields array
        if (data.length) {
            var fieldnames = Object.keys(data[0]);
            var ns = this.source_id + ":"; // ensure that namespacing is applied to the fields
            fieldnames.forEach(function(item) {
                var ref = fields.indexOf(item);
                if (ref === -1 || trans[ref]) {
                    fields.push(item);
                    outnames.push(ns + item);
                    trans.push(null);
                }
            });
        }
        return LocusZoom.Data.AssociationSource.prototype.extractFields.call(this, data, fields, outnames, trans);
    }
});

LocusZoom.TransformationFunctions.set("percent", function(x) {
    if (x === 1) { return "100%"; }
    x = (x * 100).toPrecision(2);
    if (x.indexOf('.') !== -1) { x = x.replace(/0+$/, ''); }
    if (x.endsWith('.')) { x = x.substr(0, x.length-1); }
    return x + '%';
});

(function() {
    // Define LocusZoom Data Sources object
    var localBase = window.model.urlprefix + "/api/region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources()
        .add("assoc", ["AssociationPheWeb", localBase])
        .add("catalog", ["GwasCatalogLZ", {url: remoteBase + 'annotation/gwascatalog/results/', params: { source: 2, build: "GRCh"+window.model.grch_build_number }}])
        .add("ld", ["LDLZ2", { url: "https://portaldev.sph.umich.edu/ld/",
            params: { source: '1000G', build: 'GRCh'+window.model.grch_build_number, population: 'ALL' }
        }])
        .add("gene", ["GeneLZ", { url: remoteBase + "annotation/genes/", params: {build: 'GRCh'+window.model.grch_build_number} }])
        .add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", params: {build:'GRCh'+window.model.grch_build_number} }]);

    LocusZoom.TransformationFunctions.set("neglog10_or_323", function(x) {
        if (x === 0) return 323;
        return -Math.log(x) / Math.LN10;
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
                    .setColor(layout.color).setHtml(layout.text).setTitle(layout.title)
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

    // Define the layout, then fetch it via the LZ machinery responsible for namespacing
    var layout = LocusZoom.Layouts.get("plot", "association_catalog", {
        unnamespaced: true,
        width: 800,
        // height: 550,
        responsive_resize: 'width_only',
        max_region_scale: 500e3,
        dashboard: {
            components: [{
                type: 'link',
                title: 'Go to Manhattan Plot',
                text:' Manhattan Plot',
                url: window.model.urlprefix + '/pheno/' + window.pheno.phenocode
            },{
                type: 'move',
                text: '<<',
                title: 'Shift view 1/4 to the left',
                direction: -0.75,
                group_position: "start"
            },{
                type: 'move',
                text: '<',
                title: 'Shift view 1/4 to the left',
                direction: -0.25,
                group_position: "middle"
            },{
                type: 'zoom_region',
                button_html: 'z+',
                title: 'zoom in 2x',
                step: -0.5,
                group_position: "middle"
            },{
                type: 'zoom_region',
                button_html: 'z-',
                title: 'zoom out 2x',
                step: 1,
                group_position: "middle"
            },{
                type: 'move',
                text: '>',
                title: 'Shift view 1/4 to the right',
                direction: 0.25,
                group_position: "middle"
            },{
                type: 'move',
                text: '>>',
                title: 'Shift view 3/4 to the right',
                direction: 0.75,
                group_position: "end"
            },{
                "type": "download",
                "position": "right"
            }, LocusZoom.Layouts.get('dashboard_components', 'ldlz2_pop_selector')]
        },
        panels: [
            function() {
                var l = LocusZoom.Layouts.get("panel", "annotation_catalog", {
                    unnamespaced: true,
                    height: 52, min_height: 52,
                    margin: { top: 30, bottom: 13 },
                    dashboard: { components: [] },
                    title: {
                        text: 'Hits in GWAS Catalog',
                        style: {'font-size': '14px'},
                        x: 50,
                    },
                });
                l.data_layers[0].fields = [  // Tell annotation track the field names as used by PheWeb
                    "{{namespace[assoc]}}chr", "{{namespace[assoc]}}position",
                    "{{namespace[catalog]}}variant", "{{namespace[catalog]}}rsid", "{{namespace[catalog]}}trait", "{{namespace[catalog]}}log_pvalue"
                ];
                l.data_layers[0].hit_area_width = 50;
                return l;
            }(),
            function() {
                var l = LocusZoom.Layouts.get("panel", "association_catalog", {
                    unnamespaced: true,
                    height: 200, min_height: 200,
                    margin: { top: 10 },
                    dashboard: {
                        components: [
                            {
                                type: "toggle_legend",
                                position: "right",
                                color: "green"
                            },
                            {
                                type: "display_options",
                                position: "right",
                                color: "blue",
                                // Below: special config specific to this widget
                                button_html: "Display options...",
                                button_title: "Control how plot items are displayed",

                                layer_name: "associationpvaluescatalog",
                                default_config_display_name: "No catalog labels (default)", // display name for the default plot color option (allow user to revert to plot defaults)

                                options: [
                                    {
                                        // First dropdown menu item
                                        display_name: "Label catalog traits",  // Human readable representation of field name
                                        display: {  // Specify layout directives that control display of the plot for this option
                                            label: {
                                                text: "{{{{namespace[catalog]}}trait}}",
                                                spacing: 6,
                                                lines: {
                                                    style: {
                                                        "stroke-width": "2px",
                                                        "stroke": "#333333",
                                                        "stroke-dasharray": "2px 2px"
                                                    }
                                                },
                                                filters: [
                                                    // Only label points if they are significant for some trait in the catalog, AND in high LD
                                                    //  with the top hit of interest
                                                    {
                                                        field: "{{namespace[catalog]}}trait",
                                                        operator: "!=",
                                                        value: null
                                                    },
                                                    {
                                                        field: "{{namespace[catalog]}}log_pvalue",
                                                        operator: ">",
                                                        value: 7.301
                                                    },
                                                    {
                                                        field: "{{namespace[ld]}}state",
                                                        operator: ">",
                                                        value: 0.4
                                                    },
                                                ],
                                                style: {
                                                    "font-size": "10px",
                                                    "font-weight": "bold",
                                                    "fill": "#333333"
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    data_layers: [
                        LocusZoom.Layouts.get("data_layer", "significance", { unnamespaced: true }),
                        LocusZoom.Layouts.get("data_layer", "recomb_rate", { unnamespaced: true }),
                        function() {
                            var l = LocusZoom.Layouts.get("data_layer", "association_pvalues_catalog", {
                                unnamespaced: true,
                                fields: [
                                    "{{namespace[assoc]}}all", // special mock value for the custom source
                                    "{{namespace[assoc]}}id",
                                    "{{namespace[assoc]}}position",
                                    "{{namespace[assoc]}}pvalue|neglog10_or_323",
                                    "{{namespace[ld]}}state", "{{namespace[ld]}}isrefvar",
                                    "{{namespace[catalog]}}rsid", "{{namespace[catalog]}}trait", "{{namespace[catalog]}}log_pvalue"
                                ],
                                id_field: "{{namespace[assoc]}}id",
                                tooltip: {
                                    closable: true,
                                    show: {
                                        "or": ["highlighted", "selected"]
                                    },
                                    hide: {
                                        "and": ["unhighlighted", "unselected"]
                                    },
                                    html: "<strong>{{{{namespace[assoc]}}id}}</strong><br><br>" +
                                        window.model.tooltip_lztemplate.replace(/{{/g, "{{assoc:").replace(/{{assoc:#if /g, "{{#if assoc:").replace(/{{assoc:\/if}}/g, "{{/if}}") +
                                        "<br>" +
                                        "<a href=\"" + window.model.urlprefix+ "/variant/{{{{namespace[assoc]}}chr}}-{{{{namespace[assoc]}}position}}-{{{{namespace[assoc]}}ref}}-{{{{namespace[assoc]}}alt}}\"" + ">Go to PheWAS</a>" +
                                        "{{#if {{namespace[catalog]}}rsid}}<br><a href=\"https://www.ebi.ac.uk/gwas/search?query={{{{namespace[catalog]}}rsid}}\" target=\"_new\">See hits in GWAS catalog</a>{{/if}}" +
                                        "<br><a href=\"javascript:void(0);\" onclick=\"LocusZoom.getToolTipDataLayer(this).makeLDReference(LocusZoom.getToolTipData(this));\">Make LD Reference</a>"
                                },
                                x_axis: { field: "{{namespace[assoc]}}position" },
                                y_axis: {
                                    axis: 1,
                                    field: "{{namespace[assoc]}}pvalue|neglog10_or_323",
                                    floor: 0,
                                    upper_buffer: 0.1,
                                    min_extent: [0, 10]
                                }
                            });
                            l.behaviors.onctrlclick = [{
                                action: "link",
                                href: window.model.urlprefix+"/variant/{{{{namespace[assoc]}}chr}}-{{{{namespace[assoc]}}position}}-{{{{namespace[assoc]}}ref}}-{{{{namespace[assoc]}}alt}}"
                            }];
                            return l;
                        }()
                    ],
                });
                l.legend.origin.y = 15;
                return l;
            }(),
            LocusZoom.Layouts.get("panel", "genes", {
                unnamespaced: true,
                // proportional_height: 0.5,
                dashboard: {
                    components: [{
                        type: "resize_to_data",
                        position: "right",
                        color: "blue"
                    }]
                },
                data_layers: [
                    LocusZoom.Layouts.get("data_layer", "genes", {
                        unnamespaced: true,
                        fields: ["{{namespace[gene]}}all"],
                        tooltip: {
                            closable: true,
                            show: {
                                or: ["highlighted", "selected"]
                            },
                            hide: {
                                and: ["unhighlighted", "unselected"]
                            },
                            html: ("<h4><strong><i>{{gene_name}}</i></strong></h4>" +
                                   "<div>Gene ID: <strong>{{gene_id}}</strong></div>" +
                                   "<div>Transcript ID: <strong>{{transcript_id}}</strong></div>" +
                                   "<div style=\"clear: both;\"></div>" +
                                   "<table width=\"100%\"><tr><td style=\"text-align: right;\"><a href=\"http://gnomad.broadinstitute.org/gene/{{gene_id}}\" target=\"_new\">More data on gnomAD/ExAC</a> and <a href=\"http://bravo.sph.umich.edu/freeze5/hg38/gene/{{gene_id}}\" target=\"_new\">Bravo</a></td></tr></table>")
                        },
                        label_exon_spacing: 3,
                        exon_height: 8,
                        bounding_box_padding: 5,
                        track_vertical_spacing: 5
                    })
                ],
            })
        ]
    });
    LocusZoom.Layouts.add("plot", "pheweb_association", layout);
    layout = LocusZoom.Layouts.get("plot", "pheweb_association");

    $(function() {
        // Populate the div with a LocusZoom plot using the default layout
        window.plot = LocusZoom.populate("#lz-1", data_sources, layout);
        window.plot.state.genome_build = 'GRCh'+window.model.grch_build_number;

        // Handle double-click on a variant point
        (function() {
            var doubleclick_delay_ms = 400;
            var previous_data, previous_milliseconds = 0;
            window.plot.panels.associationcatalog.on('element_clicked', function(obj) {
                var data = obj.data, milliseconds = Date.now();
                if ((data === previous_data) && (milliseconds - previous_milliseconds < doubleclick_delay_ms)) {
                    window.location.href = (window.model.urlprefix + "/variant/" +
                                            data["assoc:chr"] + "-" + data["assoc:position"] + "-" +
                                            data["assoc:ref"] + "-" + data["assoc:alt"]);
                }
                previous_data = data;
                previous_milliseconds = milliseconds;
            });
        })();
    });
})();
