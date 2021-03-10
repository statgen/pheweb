'use strict';

function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function custom_LocusZoom_Layouts_get(layout_type, layout_name, customizations) {
    // Similar to `LocusZoom.Layouts.get` but also accepts keys like "axes.x.ticks"
    var layout = LocusZoom.Layouts.get(layout_type, layout_name);
    Object.keys(customizations).forEach(function(key) {
        var value = customizations[key];
        if (!key.includes(".")) {
            layout[key] = value;
        } else {
            var key_parts = key.split(".");
            var obj = layout;
            for (var i=0; i < key_parts.length-1; i++) {
                // TODO: check that `obj` contains `key_parts[i]`
                obj = obj[key_parts[i]];
            }
            obj[key_parts[key_parts.length-1]] = value;
        }
    });
    return layout;
}

LocusZoom.TransformationFunctions.add("percent", function(x) {
    if (x === 1) { return "100%"; }
    x = (x * 100).toPrecision(2);
    if (x.indexOf('.') !== -1) { x = x.replace(/0+$/, ''); }
    if (x.endsWith('.')) { x = x.substr(0, x.length-1); }
    return x + '%';
});

LocusZoom.ScaleFunctions.add("effect_direction", function(parameters, input){
    if (typeof input === "undefined"){
        return null;
    } else if (!isNaN(input.beta)) {
        if (!isNaN(input.sebeta)) {
            if      (input.beta - 2*input.sebeta > 0) { return parameters['+'] || null; }
            else if (input.beta + 2*input.sebeta < 0) { return parameters['-'] || null; }
        } else {
            if      (input.beta > 0) { return parameters['+'] || null; }
            else if (input.beta < 0) { return parameters['-'] || null; }
        }
    } else if (!isNaN(input.or)) {
        if      (input.or > 0) { return parameters['+'] || null; }
        else if (input.or < 0) { return parameters['-'] || null; }
    }
    return null;
});

(function() {
    // sort phenotypes
    if (_.any(window.variant.phenos.map(function(d) { return d.phenocode; }).map(parseFloat).map(isNaN))) {
        window.variant.phenos = _.sortBy(window.variant.phenos, function(d) { return d.phenocode; });
    } else {
        window.variant.phenos = _.sortBy(window.variant.phenos, function(d) { return parseFloat(d.phenocode); });
    }

    window.first_of_each_category = (function() {
        var categories_seen = {};
        return window.variant.phenos.filter(function(pheno) {
            if (categories_seen.hasOwnProperty(pheno.category)) {
                return false;
            } else {
                categories_seen[pheno.category] = 1;
                return true;
            }
        });
    })();
    var category_order = (function() {
        var rv = {};
        first_of_each_category.forEach(function(pheno, i) {
            rv[pheno.category] = i;
        });
        return rv;
    })();
    // _.sortBy is a stable sort, so we just sort by category_order and we're good.
    window.variant.phenos = _.sortBy(window.variant.phenos, function(d) {
        return category_order[d.category];
    });
    window.unique_categories = d3.set(window.variant.phenos.map(_.property('category'))).values();
    const category20 = d3.schemeCategory10.concat(d3.schemeCategory10);  /* d3 removed category20, so I make this terrible version */
    window.color_by_category = d3.scaleOrdinal((unique_categories.length > 10) ? category20 : d3.schemeCategory10)
        .domain(unique_categories);

    window.variant.phenos.forEach(function(d, i) {
        d.phewas_code = d.phenocode;
        d.phewas_string = (d.phenostring || d.phenocode);
        d.category_name = d.category;
        d.color = color_by_category(d.category);
        d.idx = i;
    });
})();


(function() { // Create PheWAS plot.

    var best_neglog10_pval = d3.max(window.variant.phenos.map(function(x) { return LocusZoom.TransformationFunctions.get('neglog10')(x.pval); }));
    var neglog10_handle0 = function(x) {
        if (x === 0) return best_neglog10_pval * 1.1;
        return -Math.log(x) / Math.LN10;
    };
    LocusZoom.TransformationFunctions.add("neglog10_handle0", neglog10_handle0);

    // Define data sources object
    // TODO: Can this be replaced with StaticSource + deepcopy?
    LocusZoom.Adapters.extend('PheWASLZ', 'PheWebSource', {
        getData: function(state, fields, outnames, trans) {
            // Override all parsing, namespacing, and field extraction mechanisms, and load data embedded within the page
            trans = trans || [];

            var data = deepcopy(window.variant.phenos); //otherwise LZ adds attributes I don't want to the original data.
            data.forEach(function(d, i) {
                data[i].x = i;
                data[i].id = i.toString();
                trans.forEach(function(transformation, t){
                    if (typeof transformation === "function"){
                        data[i][outnames[t]] = transformation(data[i][fields[t]]);
                    }
                });
            });
            return function(chain) {
                return {header: chain.header || {}, body: data};
            }.bind(this);
        }
    });

    var data_sources = new LocusZoom.DataSources()
      .add("phewas", ["PheWebSource", {url: '/this/is/not/used'}]);

    var neglog10_significance_threshold = -Math.log10(0.05 / window.variant.phenos.length);

    var layout = {
        state: {
            variant: ['chrom', 'pos', 'ref', 'alt'].map(function(d) { return window.variant[d];}).join("-"),
        },
        dashboard: {
            components: [
                {type: "download", position: "right"},
                {type: "download_png", position: "right"},
            ],
        },
        min_height: 400,
        responsive_resize: true,
        mouse_guide: false,
        panels: [custom_LocusZoom_Layouts_get('panel', 'phewas', {
            min_width: 640, // feels reasonable to me
            margin: { top: 20, right: 40, bottom: 120, left: 50 },
            data_layers: [
                LocusZoom.Layouts.get('data_layer', 'significance', {
                    unnamespaced: true,
                    offset: neglog10_significance_threshold,
                }),
                custom_LocusZoom_Layouts_get('data_layer', 'phewas_pvalues', {
                    unnamespaced: true,
                    id_field: 'idx',
                    type: 'scatter',
                    color: {
                        field: "category_name",
                        scale_function: "categorical_bin",
                        parameters: {
                            categories: window.unique_categories,
                            values: window.unique_categories.map(function(cat) { return window.color_by_category(cat); }),
                        },
                    },
                    point_shape: [
                        {
                            scale_function: 'effect_direction',
                            parameters: {
                                '+': 'triangle',
                                '-': 'triangledown'
                            }
                        },
                        'circle'
                    ],
                    "y_axis.field": 'pval|neglog10_handle0',  // handles pval=0 a little better
                    "y_axis.upper_buffer": 0.1,
                    "y_axis.min_extent": [0, neglog10_significance_threshold*1.05], // always show sig line

                    "x_axis.min_extent": [-1, window.variant.phenos.length], // a little x-padding so that no points intersect the edge

                    "tooltip.closable": false,
                    "tooltip.html": ("<div><strong>{{phewas_string}}</strong></div>\n" +
                                     "<div><strong style='color:{{color}}'>{{category_name}}</strong></div>\n\n" +
                                     window.model.tooltip_lztemplate),

                    // Show labels that are: in the top 10, and (by neglog10) >=75% of sig threshold, and >=25% of best
                    "label.text": "{{phewas_string}}",
                    "label.filters": (function() {
                        var ret = [
                            {field:"pval|neglog10_handle0", operator:">", value:neglog10_significance_threshold * 3/4},
                            {field:"pval|neglog10_handle0", operator:">", value:best_neglog10_pval / 4}
                        ];
                        if (window.variant.phenos.length > 10) {
                            ret.push({field:"pval", operator:"<", value:_.sortBy(window.variant.phenos.map(_.property('pval')))[10]});
                        }
                        return ret;
                    })(),

                    "behaviors.onclick": [{action:"link", href:window.model.urlprefix+"/pheno/{{phewas_code}}"}],
                }),
            ],

            // Use categories as x ticks.
            "axes.x.ticks": window.first_of_each_category.map(function(pheno) {
                return {
                    style: {fill: pheno.color, "font-size":"11px", "font-weight":"bold", "text-anchor":"start"},
                    transform: "translate(15, 0) rotate(50)",
                    text: pheno.category,
                    x: pheno.idx
                };
            }),

            "axes.y1.label": "-log\u2081\u2080(p-value)",
        })]
    };

    $(function() {
        window.debug.plot = LocusZoom.populate("#phewas_plot_container", data_sources, layout);
    });
})();


// Check MAF/AF/MAC/AC and render
// If every pheno has AF, show that.  Otherwise, show MAF for the phenos that have it.
// If every pheno is the same (when rendered with two sigfigs), show the single value.  Otherwise, the range.
$(function() {
    function isnum(d) { return typeof d === "number"; }
    function minor(frac) { return Math.min(frac, 1-frac); }
    var afs = window.variant.phenos.map(function(v) {
        if (isnum(v.af)) { return v.af; }
        else if (isnum(v.ac) && isnum(v.num_samples)) { return v.ac / (2*v.num_samples); }
        else { return undefined; }
    }).filter(isnum);
    if (afs.length == window.variant.phenos.length) {
        // Every pheno has AF
        let af_range = d3.extent(afs).map(two_digit_format);
        if (af_range[0] === af_range[1]) { $('#maf-range').html(fmt('AF: {0}', af_range[0])); }
        else { $('#maf-range').html(fmt('AF ranges from {0} to {1}', af_range[0], af_range[1])); }
        return;
    }
    var mafs = window.variant.phenos.map(function(v) {
        if (isnum(v.maf))  { return v.maf; }
        else if (isnum(v.af)) { return minor(v.af); }
        else if (isnum(v.mac) && isnum(v.num_samples)) { return v.mac / (2*v.num_samples) }
        else if (isnum(v.ac) && isnum(v.num_samples)) { return minor(v.ac / (2*v.num_samples)); }
        else { return undefined; }
    }).filter(isnum);
    if (mafs.length === window.variant.phenos.length) {
        // Every pheno has a MAF
        let maf_range = d3.extent(mafs).map(two_digit_format);
        if (maf_range[0] === maf_range[1]) { $('#maf-range').html(fmt('MAF: {0}', maf_range[0])); }
        else { $('#maf-range').html(fmt('MAF ranges from {0} to {1}', maf_range[0], maf_range[1])); }
    } else if (mafs.length) {
        // Show the range of MAFs for the phenotypes that have a MAF
        var maf_range = d3.extent(mafs).map(two_digit_format);
        if (maf_range[0] === maf_range[1]) { $('#maf-range').html(fmt('MAF: {0} for phenotypes where it is defined', maf_range[0])); }
        else { $('#maf-range').html(fmt('MAF ranges from {0} to {1} for phenotypes where it is defined', maf_range[0], maf_range[1])); }
    }
});


// Check Clinvar and render link.
(function() {
    var clinvar_api_template = _.template('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=<%= chrom %>[Chromosome]%20AND%20<%= pos %>[Base%20Position%20for%20Assembly%20GRCh'+window.model.grch_build_number+']&retmode=json');
    var clinvar_api_url = clinvar_api_template(window.variant);

    var clinvar_link_template = _.template('https://www.ncbi.nlm.nih.gov/clinvar?term=<%= chrom %>[Chromosome]%20AND%20<%= pos %>[Base%20Position%20for%20Assembly%20GRCh'+window.model.grch_build_number+']');
    var clinvar_link_url = clinvar_link_template(window.variant);

    $.getJSON(clinvar_api_url).done(function(result) {
        if (result.esearchresult.count !== "0") {
            // It's in ClinVar
            $('#clinvar-link').html(', <a href="{URL}" target="_blank">Clinvar</a>'.replace('{URL}', clinvar_link_url));
        }
    });
})();


// Check PubMed for each rsid and render link.
if (typeof window.variant.rsids !== "undefined") {
    (function() {
        var pubmed_api_template = _.template('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=1&retmode=xml&term=<%= rsid %>');
        var pubmed_link_template = _.template('https://www.ncbi.nlm.nih.gov/pubmed/?term=<%= rsid %>');
        var rsids = window.variant.rsids.split(','); // There's usually just one rsid.
        rsids.forEach(function(rsid) {
            var pubmed_api_url = pubmed_api_template({rsid: rsid});
            var pubmed_link_url = pubmed_link_template({rsid: rsid});

            $.ajax({
                url: pubmed_api_url,
                datatype: 'xml',
            }).done(function(result) {
                // window.rv = result;
                var count_elem = result.querySelector('eSearchResult Count');
                var num_pubmed_results = (count_elem === null) ? 0 : parseInt(count_elem.textContent);
                if (num_pubmed_results > 0) {
                    if (rsids.length === 1) {
                        $('#pubmed-link').html(', <a href="{URL}" target="_blank">PubMed ({NUM} results)</a>'
                                               .replace('{URL}', pubmed_link_url)
                                               .replace('{NUM}', num_pubmed_results));
                    } else {
                        $('#pubmed-link').html(', <a href="{URL}" target="_blank">PubMed for {RSID} ({NUM} results)</a>'
                                               .replace('{URL}', pubmed_link_url)
                                               .replace('{RSID}', rsid)
                                               .replace('{NUM}', num_pubmed_results));
                    }
                }
            }).fail(function(obj) {
                console.log(['XHR for PubMed failed!', obj]);
            });
        });
    })();
}


// Populate StreamTable
$(function() {
    // This is mostly copied from <https://michigangenomics.org/health_data.html>.
    var data = _.sortBy(window.variant.phenos, function(pheno) { return pheno.pval; });
    var template = _.template($('#streamtable-template').html());
    var view = function(phenotype) {
        return template({d: phenotype});
    };
    var $found = $('#streamtable-found');
    $found.text(data.length + " total phenotypes");

    var callbacks = {
        pagination: function(summary){
            if ($.trim($('#search').val()).length > 0){
                $found.text(summary.total + " matching codes");
            } else {
                $found.text(data.length + " total codes");
            }
        }
    };

    var options = {
        view: view,
        search_box: '#search',
        per_page: 20,
        callbacks: callbacks,
        pagination: {
            span: 5,
            next_text: 'Next <span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>',
            prev_text: '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span> Previous',
            per_page_select: false,
            per_page: 10
        }
    };

    $('#stream_table').stream_table(options, data);

});
