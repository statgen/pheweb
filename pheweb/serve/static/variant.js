function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

(function() { // Create PheWAS plot.

    (function() {
        // sort phenotypes
        if (_.any(window.variant.phenos.map(function(d) { return d.phenocode; }).map(parseFloat).map(isNaN))) {
            window.variant.phenos = _.sortBy(window.variant.phenos, function(d) { return d.phenocode; });
        } else {
            window.variant.phenos = _.sortBy(window.variant.phenos, function(d) { return Number.parseFloat(d.phenocode); });
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
        window.color_by_category = ((unique_categories.length>10) ? d3.scale.category20() : d3.scale.category10())
            .domain(unique_categories);

        window.variant.phenos.forEach(function(d, i) {
            d.phewas_code = d.phenocode;
            d.phewas_string = (d.phenostring || d.phenocode);
            d.category_name = d.category;
            d.color = color_by_category(d.category);
            d.idx = i;
        });
    })();

    LocusZoom.Data.PheWASSource = LocusZoom.Data.Source.extend(function(init) {
      this.parseInit(init);
    }, "PheWASLZ");
    ['getRequest', 'fetchRequest'].forEach(function (fname) {
        LocusZoom.Data.PheWASSource.prototype[fname] = function() {
            console.log([fname, arguments]);
        };
    });
    LocusZoom.Data.PheWASSource.prototype.getData = function(state, fields, outnames, trans) {
        window.debug.getURL_args = [state, fields, outnames, trans];
        trans = trans || [];

        var data = deepcopy(window.variant.phenos);
        data.forEach(function(d, i) {
            data[i].x = i;
            data[i].id = i.toString();
            trans.forEach(function(transformation, t){
                if (typeof transformation == "function"){
                    data[i][outnames[t]] = transformation(data[i][fields[t]]);
                }
            });
        });
        window.debug.data = data;
        return function(chain) {
            return {header: chain.header || {}, body: data};
        }.bind(this);
    };

    // Define data sources object
    var neglog10_significance_threshold = -Math.log10(0.05 / window.variant.phenos.length);
    var data_sources = new LocusZoom.DataSources()
      .add("base", ["PheWASLZ", {url: '/this/is/not/used'}])

    var phewas_panel = LocusZoom.Layouts.get("panel", "phewas");

    // Make sig line, and always show it.
    phewas_panel.data_layers[0].offset = neglog10_significance_threshold;
    phewas_panel.data_layers[1].y_axis.min_extent = [0, neglog10_significance_threshold*1.05];

    // TODO: add optional elements (beta, sebeta) using new conditional syntax
    phewas_panel.data_layers[1].tooltip.html =
        "<div><strong>{{phewas_code}}</strong></div>" +
        "<div><strong>{{phewas_string}}</strong></div>" +
        "<div><strong style='color:{{color}}'>{{category_name}}</strong></div>" +
        "<div>P Value: <strong>{{pval|scinotation}}</strong></div>" +
        "<div>#cases: <strong>{{num_cases}}</strong></div>" +
        "<div>#controls: <strong>{{num_controls}}</strong></div>" +
        "<div><a href='/pheno/{{phewas_code}}'>Manhattan Plot</a></div>";
    phewas_panel.data_layers[1].label.filters[0].value = neglog10_significance_threshold;
    phewas_panel.data_layers[1].color.parameters.categories = window.unique_categories;
    phewas_panel.data_layers[1].color.parameters.values = window.unique_categories.map(function(cat) { return window.color_by_category(cat); });
    phewas_panel.axes.x.ticks = window.first_of_each_category.map(function(pheno) {
        return {
            style: {fill: pheno.color, "font-size":"11px", "font-weight":"bold", "text-anchor":"start"},
            transform: "translate(15, 0) rotate(50)",
            text: pheno.category,
            x: pheno.idx,
        };
    });
    phewas_panel.axes.y1.label = "-log\u2081\u2080(p-value)";
    window.debug.phewas_panel = phewas_panel;
    var layout = {
        state: {
            variant: ['chrom', 'pos', 'ref', 'alt'].map(d => window.variant[d]).join("-"),
        },
        dashboard: {
            components: [
                {type: "download", position: "right"}
            ]
        },
        //height: 200, // doesn't work?
        //min_height: 200
        width: 800,
        min_width: 500,
        responsive_resize: true,
        panels: [phewas_panel]
    }
    window.debug.layout = layout;

    $(function() {
        var plot = LocusZoom.populate("#phewas_plot_container", data_sources, layout);
        window.debug.plot = plot;
    });
})();


// Check Clinvar and render link.
(function() {
    var clinvar_api_template = _.template('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=<%= chrom %>[Chromosome]%20AND%20<%= pos %>[Base%20Position%20for%20Assembly%20GRCh37]&retmode=json');
    var clinvar_api_url = clinvar_api_template(window.variant);

    var clinvar_link_template = _.template('https://www.ncbi.nlm.nih.gov/clinvar?term=<%= chrom %>[Chromosome]%20AND%20<%= pos %>[Base%20Position%20for%20Assembly%20GRCh37]');
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
                var num_pubmed_results = (count_elem === null) ? 0 : Number.parseInt(count_elem.textContent);
                if (num_pubmed_results > 0) {
                    if (rsids.length == 1) {
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
    }

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
    }

    $('#stream_table').stream_table(options, data);

});
