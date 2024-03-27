'use strict';

LocusZoom.Adapters.extend("AssociationLZ", "AssociationPheWeb", {
    _getURL: function (request_options) {
        const { chr, start, end } = request_options;
        return `${this._url}results/?filter=chromosome in  '${chr}' and position ge ${start} and position le ${end}`;
    },

    _normalizeResponse(response_text) {
        // The PheWeb region API has a fun quirk where if there is no data, there are also no keys
        //   (eg data = {} instead of  {assoc:[]} etc. Explicitly detect and handle the edge case in PheWeb;
        //   we won't handle this in LZ core because we don't want squishy-blob API schemas to catch on.
        const data = JSON.parse(response_text);
        if (!Object.keys(data.data).length) {
            return [];
        }
        return LocusZoom.Adapters.get('AssociationLZ').prototype._normalizeResponse.call(this, data);
    },

    _annotateRecords(records) {
        // The LD Adapter expects to see a field named "variant" with variant specifier. PheWeb API calls this "ID".
        records.forEach((item) => item.variant = item.id);
        return records;
    }
});

LocusZoom.TransformationFunctions.add("percent", function(x) {
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
        .add("assoc", ["AssociationPheWeb", {url: localBase }])
        .add("catalog", ["GwasCatalogLZ", {url: remoteBase + 'annotation/gwascatalog/results/', build: "GRCh"+window.model.grch_build_number }])
        .add("ld", ["LDServer", { url: "https://portaldev.sph.umich.edu/ld/", source: '1000G', build: 'GRCh'+window.model.grch_build_number, population: 'ALL' }])
        .add("gene", ["GeneLZ", { url: remoteBase + "annotation/genes/", build: 'GRCh'+window.model.grch_build_number }])
        .add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", build:'GRCh'+window.model.grch_build_number }]);

    LocusZoom.TransformationFunctions.add("neglog10_or_323", function(x) {
        if (x === 0) return 323;
        return -Math.log(x) / Math.LN10;
    });

    // Toolbar Widgets
    function add_toolbar_button(name, click_handler) {
        LocusZoom.Widgets.extend('BaseWidget', name, {
            update() {
                if (this.button)
                    return this;
                this.button = new (LocusZoom.Widgets.get('_Button'))(this)
                    .setColor(this.layout.color)
                    .setHtml(this.layout.text)
                    .setTitle(this.layout.title)
                    .setOnclick(click_handler.bind(this));
                this.button.show();
                return this.update();
            }
        });
    }

    add_toolbar_button('link', function() {
        window.location.href = this.layout.url;
    });

    add_toolbar_button('move', function() {
        // FIXME: Replace with the LocusZoom widget`shift_region` (after adding a stepsize mode for relative region widths)
        var start = this.parent_plot.state.start;
        var end = this.parent_plot.state.end;
        var shift = Math.floor(end - start) * this.layout.direction;
        this.parent_plot.applyState({
            chr: this.parent_plot.state.chr,
            start: start + shift,
            end: end + shift
        });
    });

    // Define the layout, then fetch it via the LZ machinery responsible for namespacing
    var layout = LocusZoom.Layouts.get("plot", "association_catalog", {
        width: 800,
        responsive_resize: true,
        max_region_scale: 500e3,
        toolbar: {
            widgets: [{
                type: 'link',
                title: 'Go to Manhattan Plot',
                text:' Manhattan Plot',
                url: window.model.urlprefix + '/pheno/' + window.pheno.phenocode,
                position: 'left',
            }, {
                type: 'move',
                text: '<<',
                title: 'Shift view 1/4 to the left',
                direction: -0.75,
                group_position: "start"
            }, {
                type: 'move',
                text: '<',
                title: 'Shift view 1/4 to the left',
                direction: -0.25,
                group_position: "middle"
            }, {
                type: 'zoom_region',
                button_html: 'z+',
                title: 'zoom in 2x',
                step: -0.5,
                group_position: "middle"
            }, {
                type: 'zoom_region',
                button_html: 'z-',
                title: 'zoom out 2x',
                step: 1,
                group_position: "middle"
            }, {
                type: 'move',
                text: '>',
                title: 'Shift view 1/4 to the right',
                direction: 0.25,
                group_position: "middle"
            }, {
                type: 'move',
                text: '>>',
                title: 'Shift view 3/4 to the right',
                direction: 0.75,
                group_position: "end"
            }, {
                type: 'download',
                position: 'right',
            }, {
                type: 'download_png',
                position: 'right',
            }, LocusZoom.Layouts.get('toolbar_widgets', 'ldlz2_pop_selector')]
        },
        panels: [
            function() {
                var base = LocusZoom.Layouts.get("panel", "annotation_catalog", {
                    height: 52, min_height: 52,
                    margin: { top: 30, bottom: 13 },
                    toolbar: { widgets: [] },
                    axes: {
                        x: { extent: 'state' }
                    },
                    title: {
                        text: 'Hits in GWAS Catalog',
                        style: {'font-size': '14px'},
                        x: 50,
                    },
                });
                var anno_layer = base.data_layers[0];
                anno_layer.id_field = "assoc:id";
                anno_layer.hit_area_width = 50;
                return base;
            }(),
            function() {
                // FIXME: The only customization here is to make the legend button green and hide the "move panel" buttons; display options doesn't need to be copy-pasted
                var base = LocusZoom.Layouts.get("panel", "association_catalog", {
                    height: 250,
                    min_height: 200,
                    margin: { top: 10 },
                    toolbar: {
                        widgets: [
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
                                                        field: "catalog:trait",
                                                        operator: "!=",
                                                        value: null
                                                    },
                                                    {
                                                        field: "catalog:log_pvalue",
                                                        operator: ">",
                                                        value: 7.301
                                                    },
                                                    {
                                                        field: "ld:state",
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
                        LocusZoom.Layouts.get("data_layer", "significance"),
                        LocusZoom.Layouts.get("data_layer", "recomb_rate"),
                        function() {
                            var l = LocusZoom.Layouts.get("data_layer", "association_pvalues_catalog", {
                                id_field: "assoc:id",
                                tooltip: {
                                    closable: true,
                                    show: {
                                        "or": ["highlighted", "selected"]
                                    },
                                    hide: {
                                        "and": ["unhighlighted", "unselected"]
                                    },
                                    html: "<strong>{{assoc:id}}</strong><br><br>" +
                                        window.model.tooltip_lztemplate.replace(/{{/g, "{{assoc:").replace(/{{assoc:#if /g, "{{#if assoc:").replace(/{{assoc:\/if}}/g, "{{/if}}") +
                                        "<br>" +
                                        "<a href=\"" + window.model.urlprefix+ "/variant/{{assoc:chr}}-{{assoc:position}}-{{assoc:ref}}-{{assoc:alt}}\"" + ">Go to PheWAS</a>" +
                                        "{{#if catalog:rsid}}<br><a href=\"https://www.ebi.ac.uk/gwas/search?query={{catalog:rsid}}\" target=\"_new\">See hits in GWAS catalog</a>{{/if}}" +
                                        "<br>{{#if ld:isrefvar}}<strong>LD Reference Variant</strong>{{#else}}<a href=\"javascript:void(0);\" onclick=\"var data = this.parentNode.__data__;data.getDataLayer().makeLDReference(data);\">Make LD Reference</a>{{/if}}<br>"
                                },
                                x_axis: { field: "assoc:position" },
                                y_axis: {
                                    axis: 1,
                                    field: "assoc:pvalue|neglog10_or_323",
                                    floor: 0,
                                    upper_buffer: 0.1,
                                    min_extent: [0, 10]
                                }
                            });
                            l.behaviors.onctrlclick = [{
                                action: "link",
                                href: window.model.urlprefix+"/variant/{{assoc:chr}}-{{assoc:position}}-{{assoc:ref}}-{{assoc:alt}}"
                            }];
                            return l;
                        }()
                    ],
                });
                base.legend.origin.y = 15;
                return base;
            }(),
            LocusZoom.Layouts.get("panel", "genes", {
                // proportional_height: 0.5,
                toolbar: {
                    widgets: [{
                        type: "resize_to_data",
                        position: "right",
                        color: "blue"
                    }, LocusZoom.Layouts.get('toolbar_widgets', 'gene_selector_menu')]
                },
                data_layers: [
                    function () {
                        const base = LocusZoom.Layouts.get("data_layer", "genes_filtered", {
                            tooltip: {
                                html: ("<h4><strong><i>{{gene_name}}</i></strong></h4>" +
                                       "<div>Gene ID: <strong>{{gene_id}}</strong></div>" +
                                       "<div>Transcript ID: <strong>{{transcript_id}}</strong></div>" +
                                       "<div style=\"clear: both;\"></div>" +
                                       "<table width=\"100%\"><tr><td style=\"text-align: right;\"><a href=\"http://gnomad.broadinstitute.org/gene/{{gene_id}}\" target=\"_new\">More data on gnomAD/ExAC</a> and <a href=\"http://bravo.sph.umich.edu/freeze5/hg38/gene/{{gene_id}}\" target=\"_new\">Bravo</a></td></tr></table>")
                            },
                            data_operations: [
                                // Unlike the parent data layer, PheWeb does not fetch or display gene constraint from gnomAD
                                { type: 'fetch', from: ['gene'] },
                            ]
                        });
                        // Base LocusZoom genes layer specifies two namespaces. We can't *remove* a field through "Layouts.get" (because that just merges object keys). Instead we override the namespace section completely.
                        base.namespace = { gene: 'gene' };
                        return base;
                    }(),
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
