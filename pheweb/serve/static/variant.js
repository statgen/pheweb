'use strict';

function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

LocusZoom.TransformationFunctions.set("percent", function (x) {
    if (x === 1) {
        return "100%";
    }
    x = (x * 100).toPrecision(2);
    if (x.indexOf('.') !== -1) {
        x = x.replace(/0+$/, '');
    }
    if (x.endsWith('.')) {
        x = x.substr(0, x.length - 1);
    }
    return x + '%';
});

LocusZoom.ScaleFunctions.add("effect_direction", function (parameters, input) {
    if (typeof input === "undefined") {
        return null;
    } else if (!isNaN(input.beta)) {
        if (!isNaN(input.sebeta)) {
            if (input.beta - 2 * input.sebeta > 0) {
                return parameters['+'] || null;
            } else if (input.beta + 2 * input.sebeta < 0) {
                return parameters['-'] || null;
            }
        } else {
            if (input.beta > 0) {
                return parameters['+'] || null;
            } else if (input.beta < 0) {
                return parameters['-'] || null;
            }
        }
    } else if (!isNaN(input.or)) {
        if (input.or > 0) {
            return parameters['+'] || null;
        } else if (input.or < 0) {
            return parameters['-'] || null;
        }
    }
    return null;
});

(function () {
    // sort phenotypes. Phenocodes may be string or numeric.
    if (_.any(window.variant.phenos.map(function (d) {
        return d.phenocode;
    }).map(parseFloat).map(isNaN))) {
        window.variant.phenos = _.sortBy(window.variant.phenos, function (d) {
            return d.phenocode;
        });
    } else {
        window.variant.phenos = _.sortBy(window.variant.phenos, function (d) {
            return +d.phenocode;
        });
    }

    window.variant.phenos.forEach(function (d, i) {
        d.phewas_code = d.phenocode;
        d.phewas_string = (d.phenostring || d.phenocode);
        d.category_name = d.category;
        d.idx = i;
    });
})();


(function () { // Create PheWAS plot.

    var best_neglog10_pval = d3.max(window.variant.phenos.map(function (x) {
        return LocusZoom.TransformationFunctions.get('neglog10')(x.pval);
    }));
    var neglog10_handle0 = function (x) {
        // A 0 pvalue would break the plot. Replace it with a synthetic value higher than anything else on the plot
        // FIXME: Revisit
        if (x === 0) return best_neglog10_pval * 1.1;
        return -Math.log(x) / Math.LN10;
    };
    LocusZoom.TransformationFunctions.set("neglog10_handle0", neglog10_handle0);

    // Define data sources object
    LocusZoom.Data.PheWASSource.prototype.getData = function (state, fields, outnames, trans) {
        // Override all parsing, namespacing, and field extraction mechanisms, and load data embedded within the page
        trans = trans || [];

        var data = deepcopy(window.variant.phenos); //otherwise LZ adds attributes I don't want to the original data.
        data.forEach(function (d, i) {
            data[i].x = i;
            data[i].id = i.toString();
            trans.forEach(function (transformation, t) {
                if (typeof transformation === "function") {
                    data[i][outnames[t]] = transformation(data[i][fields[t]]);
                }
            });
        });
        return function (chain) {
            return { header: chain.header || {}, body: data };
        }.bind(this);
    };
    var data_sources = new LocusZoom.DataSources()
        .add("phewas", ["PheWASLZ", { url: '/this/is/not/used' }]);

    var neglog10_significance_threshold = -Math.log10(0.05 / window.variant.phenos.length);

    var layout = {
        state: {
            variant: ['chrom', 'pos', 'ref', 'alt'].map(function (d) {
                return window.variant[d];
            }).join("-"),
        },
        dashboard: {
            components: [{ type: "download", position: "right" }],
        },
        min_height: 400,
        responsive_resize: "width_only",
        mouse_guide: false,
        panels: [
            LocusZoom.Layouts.get('panel', 'phewas', {
                // unnamespaced: true,
                min_width: 640, // feels reasonable to me
                margin: { top: 20, right: 40, bottom: 120, left: 50 },
                data_layers: [
                    LocusZoom.Layouts.get('data_layer', 'significance', {
                        unnamespaced: true,
                        offset: neglog10_significance_threshold,
                    }),
                    LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', {
                        unnamespaced: true,
                        id_field: 'idx',
                        color: [{
                            field: "category",
                            scale_function: "categorical_bin",
                            parameters: {
                                categories: [],
                                values: [],
                                null_value: '#B8B8B8',
                            },
                        }],
                        point_shape: [
                            {
                                scale_function: 'effect_direction',
                                parameters: {
                                    '+': 'triangle-up',
                                    '-': 'triangle-down'
                                }
                            },
                            'circle'
                        ],
                        y_axis: {
                            field: 'pval|neglog10_handle0',  // handles pval=0 a little better
                            upper_buffer: 0.1,
                            min_extent: [0, neglog10_significance_threshold * 1.05], // always show sig line

                        },
                        x_axis: {
                            category_field: 'category',
                            lower_buffer: 0.025,
                            upper_buffer: 0.025
                        },
                        tooltip: {
                            closable: false,
                            html: (
                                "<div><strong>{{phewas_string}}</strong></div>\n" +
                                "<div><strong style='color:{{color}}'>{{category_name}}</strong></div>\n\n" +
                                window.model.tooltip_lztemplate
                            ),
                        },
                        label: {
                            // Show labels that are: in the top 10, and (by neglog10) >=75% of sig threshold, and >=25% of best
                            text: "{{phewas_string}}",
                            filters: (function () {
                                var ret = [
                                    {
                                        field: "pval|neglog10_handle0",
                                        operator: ">",
                                        value: neglog10_significance_threshold * 3 / 4
                                    },
                                    { field: "pval|neglog10_handle0", operator: ">", value: best_neglog10_pval / 4 }
                                ];
                                if (window.variant.phenos.length > 10) {
                                    ret.push({
                                        field: "pval",
                                        operator: "<",
                                        value: _.sortBy(window.variant.phenos.map(_.property('pval')))[10]
                                    });
                                }
                                return ret;
                            })(),
                        },
                        behaviors: {
                            onclick: [{
                                action: "link",
                                href: window.model.urlprefix + "/pheno/{{phewas_code}}"
                            }],
                        }
                    }),
                ],
            })
        ]
    };

    $(function () {
        window.debug.plot = LocusZoom.populate("#phewas_plot_container", data_sources, layout);
    });
})();


// Check MAF/AF/AC and render
(function () {
    var isnum = function (d) {
        return typeof d === "number";
    };
    var mafs = window.variant.phenos.map(function (v) {
        if (isnum(v.maf)) {
            return v.maf;
        } else if (isnum(v.af)) {
            return Math.min(v.af, 1 - v.af);
        } else if (isnum(v.ac) && isnum(v.num_samples)) {
            var af = v.ac / (2 * v.num_samples);
            return Math.min(af, 1 - af);
        } else {
            return undefined;
        }
    });
    var num_phenos_with_maf = _.filter(mafs, function (d) {
        return isnum(d)
    }).length;
    if (num_phenos_with_maf === mafs.length) {
        var range = d3.extent(mafs);
        $(function () {
            $('#maf-range').html('<p>MAF ranges from ' + two_digit_format(range[0]) + ' to ' + two_digit_format(range[1]) + '</p>');
            $('#maf-range p').css('margin-bottom', '0');
        });
    } else if (num_phenos_with_maf > 0) {
        var range = d3.extent(mafs);
        $(function () {
            $('#maf-range').html('<p>MAF ranges from ' + two_digit_format(range[0]) + ' to ' + two_digit_format(range[1]) + ' for phenotypes where it is defined</p>');
            $('#maf-range p').css('margin-bottom', '0');
        });
    }
})();


// Check Clinvar and render link.
(function () {
    var clinvar_api_template = _.template('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=<%= chrom %>[Chromosome]%20AND%20<%= pos %>[Base%20Position%20for%20Assembly%20GRCh37]&retmode=json');
    var clinvar_api_url = clinvar_api_template(window.variant);

    var clinvar_link_template = _.template('https://www.ncbi.nlm.nih.gov/clinvar?term=<%= chrom %>[Chromosome]%20AND%20<%= pos %>[Base%20Position%20for%20Assembly%20GRCh37]');
    var clinvar_link_url = clinvar_link_template(window.variant);

    $.getJSON(clinvar_api_url).done(function (result) {
        if (result.esearchresult.count !== "0") {
            // It's in ClinVar
            $('#clinvar-link').html(', <a href="{URL}" target="_blank">Clinvar</a>'.replace('{URL}', clinvar_link_url));
        }
    });
})();


// Check PubMed for each rsid and render link.
if (typeof window.variant.rsids !== "undefined") {
    (function () {
        var pubmed_api_template = _.template('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=1&retmode=xml&term=<%= rsid %>');
        var pubmed_link_template = _.template('https://www.ncbi.nlm.nih.gov/pubmed/?term=<%= rsid %>');
        var rsids = window.variant.rsids.split(','); // There's usually just one rsid.
        rsids.forEach(function (rsid) {
            var pubmed_api_url = pubmed_api_template({ rsid: rsid });
            var pubmed_link_url = pubmed_link_template({ rsid: rsid });

            $.ajax({
                url: pubmed_api_url,
                datatype: 'xml',
            }).done(function (result) {
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
            }).fail(function (obj) {
                console.log(['XHR for PubMed failed!', obj]);
            });
        });
    })();
}


// Populate StreamTable
$(function () {
    // This is mostly copied from <https://michigangenomics.org/health_data.html>.
    var data = _.sortBy(window.variant.phenos, function (pheno) {
        return pheno.pval;
    });
    var template = _.template($('#streamtable-template').html());
    var view = function (phenotype) {
        return template({ d: phenotype });
    };
    var $found = $('#streamtable-found');
    $found.text(data.length + " total phenotypes");

    var callbacks = {
        pagination: function (summary) {
            if ($.trim($('#search').val()).length > 0) {
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
