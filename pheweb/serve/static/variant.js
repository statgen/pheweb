(function() { // Create PheWAS plot.

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

    window.color_by_category = (function() {
        var unique_categories = d3.set(window.variant.phenos.map(_.property('category'))).values();
        return ((unique_categories.length>10) ? d3.scale.category20() : d3.scale.category10())
            .domain(unique_categories);
    })();

})();

(function() { // Create PheWAS plot.
    $(function() {
        var svg_width = $('#phewas_plot_container').width();
        var svg_height = 550;
        var significance_threshold = 0.05 / window.variant.phenos.length;

        var plot_margin = {
            'left': 70,
            'right': 30,
            'top': 10,
            'bottom': 170,
        };

        var plot_width = svg_width - plot_margin.left - plot_margin.right;
        var plot_height = svg_height - plot_margin.top - plot_margin.bottom;


        var x_scale = d3.scale.linear()
            .domain([0, window.variant.phenos.length])
            .range([0, plot_width]);

        // 1.03 puts points clamped to the top (pval=0) slightly above other points.
        var highest_plot_neglog10_pval = 1.03 * -Math.log10(
            Math.min(significance_threshold*.8,
                     (function() {
                         var pvals = window.variant.phenos.map(_.property('pval'));
                         var nonzero_pvals = pvals.filter(function(d) { return d !== 0; });
                         return (nonzero_pvals.length > 0) ? d3.min(nonzero_pvals) : 1;
                     })()));

        var y_scale = d3.scale.linear()
            .domain([highest_plot_neglog10_pval, 0])
            // 0.97 leaves a little space above points clamped to the top.
            .range([0, plot_height*.97])
            .clamp(true);

        var phewas_svg = d3.select('#phewas_plot_container').append("svg")
            .attr('id', 'phewas_svg')
            .attr("width", svg_width)
            .attr("height", svg_height)
            .style("display", "block")
            .style("margin", "auto");
        var phewas_plot = phewas_svg.append("g")
            .attr('id', 'phewas_plot')
            .attr("transform", fmt("translate({0},{1})", plot_margin.left, plot_margin.top));

        // Significance Threshold line
        var significance_threshold_tooltip = d3.tip()
            .attr('class', 'd3-tip')
            .html('Bonferroni Significance Threshold: ' + significance_threshold.toExponential(1))
            .offset([-8,0]);
        phewas_svg.call(significance_threshold_tooltip);
        phewas_plot.append('line')
            .attr('x1', 0)
            .attr('x2', plot_width)
            .attr('y1', y_scale(-Math.log10(significance_threshold)))
            .attr('y2', y_scale(-Math.log10(significance_threshold)))
            .attr('stroke-width', '5px')
            .attr('stroke', 'lightgray')
            .attr('stroke-dasharray', '10,10')
            .on('mouseover', significance_threshold_tooltip.show)
            .on('mouseout', significance_threshold_tooltip.hide);

        // Points & labels
        var tooltip_template = _.template($('#tooltip-template').html());
        var point_tooltip = d3.tip()
            .attr('class', 'd3-tip')
            .html(function(d) {
                return tooltip_template({d: d, color_by_category: color_by_category});
            })
            .offset([-8,0]);
        phewas_svg.call(point_tooltip);

        var links = phewas_plot.selectAll('a.pheno_point')
            .data(window.variant.phenos)
            .enter()
            .append('a')
            .attr('class', 'pheno_point')
            .attr('xlink:href', function(d) {
                return '/pheno/' + d.phenocode;
            })
            .each(function(d, i) {
                d.myIndex = i;
            });
        links.append('circle')
            .attr('cx', function(d) {
                return x_scale(d.myIndex);
            })
            .attr('cy', function(d) {
                return y_scale(-Math.log10(d.pval));
            })
            .attr('r', 5)
            .style('fill', function(d) {
                return color_by_category(d.category);
            })
            .style('fill-opacity', 0.5)
            .style('stroke-width', 1)
            .style('stroke', function(d) {
                return color_by_category(d.category);
            })
            .on('mouseover', function(d) {
                //Note: once a tooltip has been explicitly placed once, it must be explicitly placed forever after.
                point_tooltip.show(d, this);
                // console.log(fmt('{0} {1}', x_scale(d.myIndex), y_scale(-Math.log10(d.pval))), this);
            })
            .on('mouseout', point_tooltip.hide);
        links
            .each(function(d) {
                d.myCircle = this.firstChild;
            })
            .filter(function(d) {
                return d.pval < significance_threshold;
            })
            .append('text')
            .style('text-anchor', 'start')
            .attr('x', function(d) {
                return x_scale(d.myIndex) + 10;
            })
            .attr('y', function(d) {
                return y_scale(-Math.log10(d.pval));
            })
            .attr('dy', '.3em') // vertically center
            .text(function(d) {
                var text = d.phenostring || d.phenocode;
                if (text.length < 30) {
                    return text;
                } else {
                    // Try to cut the string at a space.
                    var break_index = text.slice(20, 30).indexOf(' ');
                    break_index = (break_index === -1) ? 25 : 20 + break_index;
                    return text.slice(0, break_index).trim() + '...';
                }
            })
            .on('mouseover', function(d) {
                point_tooltip.show(d, d.myCircle);
            })
            .on('mouseout', point_tooltip.hide);


        // Axes
        var yAxis = d3.svg.axis()
            .scale(y_scale)
            .orient("left")
            .tickFormat(d3.format("d"));
        phewas_plot.append("g")
            .attr("class", "y axis")
            .attr('transform', 'translate(-3,0)') // avoid letting points spill through the y axis.
            .call(yAxis);

        phewas_svg.append('text')
            .style('text-anchor', 'middle')
            .attr('transform', fmt('translate({0},{1})rotate(-90)',
                                   plot_margin.left*.4,
                                   plot_height/2 + plot_margin.top))
            .text('-log\u2081\u2080(p-value)'); // Unicode subscript "10"

        var xAxis = d3.svg.axis()
            .scale(x_scale)
            .orient("bottom")
            .ticks(0);
        phewas_plot.append("g")
            .attr("class", "x axis")
            .attr("transform", fmt("translate(0,{0})", plot_height))
            .call(xAxis);

        phewas_svg.selectAll('text.category')
            .data(first_of_each_category)
            .enter() // Do we need this?
            .append('text')
            .style('text-anchor', 'start')
            .attr('transform', function(d) {
                return fmt('translate({0},{1})rotate(50)',
                           plot_margin.left + x_scale(d.myIndex) + 3,
                           plot_height + plot_margin.top + 15);
            })
            .text(_.property('category'))
            .style('fill', function(d) {
                return color_by_category(d.category);
            });

    });
})();

(function() { // Check Clinvar and render link.
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


if (typeof window.variant.rsids !== "undefined") {
    (function() { // Check PubMed for each rsid and render link.
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
                console.log(['failed!', obj]);
            });
        });
    })();
}

$(function() { // Populate StreamTable
    // This is mostly copied from <https://michigangenomics.org/health_data.html>.
    var data = _.sortBy(window.variant.phenos, function(pheno) { return pheno.pval; });
    var template = _.template($('#streamtable-template').html());
    var view = function(phenotype) {
        return template({d: phenotype, color_by_category: color_by_category});
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
