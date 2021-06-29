'use strict';

const pval_sentinel = 5e-324

function formatPValue(pval){
    if(pval == pval_sentinel){
	return `<< ${pval_sentinel}`
    } else {
	return pval ? pval.toExponential(1) : "";
    }
    
}

function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

LocusZoom.TransformationFunctions.set("percent", function(x) {
    if (x === 1) { return "100%"; }
    var x = (x*100).toPrecision(2);
    if (x.indexOf('.') !== -1) { x = x.replace(/0+$/, ''); }
    if (x.endsWith('.')) { x = x.substr(0, x.length-1); }
    return x + '%';
});

LocusZoom.TransformationFunctions.set("formatPValue", function(x){
    if (x == "4.94 × 10^-324"){
	return `<< ${pval_sentinel}`;
    } else { 
	return x;
    }
});


(function() {
    // sort phenotypes

    if (_.all(window.results.map(function(d) { return d.category_index !== undefined }))) {
        window.results = _.sortBy(window.results, function(d) { return d.category_index });
    } else if (_.any(window.results.map(function(d) { return d.phenocode; }).map(parseFloat).map(isNaN))) {
        window.results = _.sortBy(window.results, function(d) { return d.phenocode; });
    } else {
        window.results = _.sortBy(window.results, function(d) { return parseFloat(d.phenocode); });
    }

    window.first_of_each_category = (function() {
        var categories_seen = {};
        return window.results.filter(function(pheno) {
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
    window.results = _.sortBy(window.results, function(d) {
        return category_order[d.category];
    });
    window.unique_categories = d3.set(window.results.map(_.property('category'))).values();
    window.color_by_category = ((unique_categories.length>10) ? d3.scale.category20() : d3.scale.category10())
        .domain(unique_categories);

    window.results.forEach(function(d, i) {
        d.phewas_code = d.phenocode;
        d.phewas_string = (d.phenostring || d.phenocode);
        d.category_name = d.category;
        d.color = color_by_category(d.category);
        d.idx = i;
    });
})();


(function() { // Create PheWAS plot.

    window.results.forEach(function(pheno) {
	pheno.pScaled = pheno.mlogp? pheno.mlogp : -Math.log10(pheno.pval)
	if (pheno.pScaled > window.vis_conf.loglog_threshold) {
	    pheno.pScaled = window.vis_conf.loglog_threshold * Math.log10(pheno.pScaled) / Math.log10(window.vis_conf.loglog_threshold)
	}
    })

    var best_neglog10_pval = d3.max(window.results.map(function(x) { return LocusZoom.TransformationFunctions.get('neglog10')(x.pval); }));

    var neglog10_handle0 = function(x) {
	if (x === 0) return best_neglog10_pval * 1.1;
	var log = -Math.log(x) / Math.LN10;
	return log;
    };
    LocusZoom.TransformationFunctions.set("neglog10_handle0", neglog10_handle0);

    LocusZoom.ScaleFunctions.add("effect_direction", function(parameters, input){
        if (typeof input == "undefined"){
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

    LocusZoom.Data.PheWASSource.prototype.getData = function(state, fields, outnames, trans) {
        window.debug.getData_args = [state, fields, outnames, trans];
        trans = trans || [];

        var data = deepcopy(window.results); //otherwise LZ adds attributes I don't want to the original data.
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
    var significance_threshold = 0.05 / window.results.length;
    var neglog10_significance_threshold = -Math.log10(significance_threshold);
    var data_sources = new LocusZoom.DataSources()
      .add("base", ["PheWASLZ", {url: '/this/is/not/used'}])

    var phewas_panel = LocusZoom.Layouts.get("panel", "phewas");
    var sig_data_layer = phewas_panel.data_layers[0]; //significance line
    var pval_data_layer = phewas_panel.data_layers[1];

    // Make sig line, and always show it.
    sig_data_layer.offset = neglog10_significance_threshold;
    sig_data_layer.tooltip = { //TODO: modify LZ to support tooltips on a line. right now this doesn't do anything.
        closable: true,
        html: 'foo',
        hide: { 'and': ['unhighlighted', 'unselected'] },
        show: { 'or': ['highlighted', 'selected'] }
    };
    pval_data_layer.y_axis.min_extent = [0, neglog10_significance_threshold*1.05];
    pval_data_layer.y_axis.upper_buffer = 0.1;

    // tooltips
    pval_data_layer.tooltip.html =
        "<div><strong>{{phewas_string}}</strong></div>\n" +
        "<div><strong style='color:{{color}}'>{{category_name}}</strong></div>\n\n" +
        window.model.tooltip_lztemplate;
    pval_data_layer.tooltip.closable = false;

    pval_data_layer.y_axis.field = 'pScaled';

    // Show labels that are: in the top 10, and (by neglog10) >=75% of sig threshold, and >=25% of best.
    pval_data_layer.label.filters = [
        {field:"pval|neglog10_handle0", operator:">", value:neglog10_significance_threshold * 3/4},
        {field:"pval|neglog10_handle0", operator:">", value:best_neglog10_pval / 4},
    ];
    if (window.results.length > 10) {
        pval_data_layer.label.filters.push(
            {field:"mlogp", operator:"<", value:_.sortBy(window.results.map(_.property('mlogp')))[10]});
    }

    // Color points by category.
    pval_data_layer.color.parameters.categories = window.unique_categories;
    pval_data_layer.color.parameters.values = window.unique_categories.map(function(cat) { return window.color_by_category(cat); });

    // Shape points by effect direction.
    pval_data_layer.point_shape = [
        {
            scale_function: 'effect_direction',
            parameters: {
                '+': 'triangle-up',
                '-': 'triangle-down',
            }
        },
        'circle'
    ];

    // Make points clickable
    pval_data_layer.behaviors.onclick = [{action:"link", href:"/pheno/{{phewas_code}}"}];

    // Use categories as x ticks.
    phewas_panel.axes.x.ticks = window.first_of_each_category.map(function(pheno) {
        return {
            style: {fill: pheno.color, "font-size":"11px", "font-weight":"bold", "text-anchor":"start"},
            transform: "translate(15, 0) rotate(50)",
            text: pheno.category,
            x: pheno.idx,
        };
    });

    // Show (log-)log scale on the y axis
    var maxLogPScaled = window.results.reduce((acc, cur) => {
	return Math.max(acc, cur.pScaled)
    }, 0)
    var ticks = []
    var unscaled = 0
    var scaled = 0
    while (scaled < best_neglog10_pval) {
	scaled = unscaled <= window.vis_conf.loglog_threshold ? unscaled : Math.round(Math.pow(window.vis_conf.loglog_threshold, unscaled/window.vis_conf.loglog_threshold))
	ticks.push({y: unscaled, text: scaled})
	unscaled += maxLogPScaled < 10 ? 1 : maxLogPScaled < 25 ? 2 : 5
    }
    phewas_panel.axes.y1.ticks = ticks

    phewas_panel.axes.y1.label = '-log\u2081\u2080p-value'

    // add a little x-padding so that no points intersect the edge
    pval_data_layer.x_axis.min_extent = [-1, window.results.length];


    window.debug.phewas_panel = phewas_panel;
    window.debug.pval_data_layer = pval_data_layer;
    var layout = {
        state: {
            variant: ['chr', 'pos', 'ref', 'alt'].map(function(d) { return window.variant[d];}).join("-"),
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
        panels: [phewas_panel],
        mouse_guide: false
    }
    window.debug.layout = layout;

    $(function() {
        var plot = LocusZoom.populate("#phewas_plot_container", data_sources, layout);
        window.debug.plot = plot;
    });
})();


// Check MAF/AF/AC and render
(function() {
    var isnum = function(d) { return typeof d == "number"; };
    var mafs = window.results.map(function(v) {
        if (isnum(v.maf_control))  { return v.maf_control; }
        else if (isnum(v.af)) { return v.af; }
        else if (isnum(v.af_alt)) { return v.af_alt; }
        else if (isnum(v.maf)) { return v.maf; }
        else if (isnum(v.ac) && isnum(v.num_samples)) { return v.ac / v.num_samples; }
        else { return undefined; }
    });
    window.debug.mafs = mafs;
    var num_phenos_with_maf = _.filter(mafs, function(d) { return isnum(d) }).length;
    if (num_phenos_with_maf === mafs.length) {
        var range = d3.extent(mafs);
        $(function() {
            $('#maf-range').html('<p style="text-decoration: underline;" title="' +
				 _.template($('#af-tooltip-template').html())({v:window.variant}) +
				 '" data-toggle="tooltip">AF ' + (window.variant.annotation.annot.AF && window.variant.annotation.annot.AF.toExponential(1)) +
				 ' (ranges from ' + range[0].toExponential(1) + ' to ' + range[1].toExponential(1) + ' across all phenotypes)</p>');
            $('#maf-range p').css('margin-bottom', '0');
        });
    } else if (num_phenos_with_maf > 0) {
        var range = d3.extent(mafs);
        $(function() {
            $('#maf-range').html('<p style="text-decoration: underline;" title="' + _.template($('#af-tooltip-template').html())({v:window.variant}) + '" data-toggle="tooltip">AF ' + (window.variant.annotation.annot && window.variant.annotation.annot.AF && window.variant.annotation.annot.AF.toExponential(1)) + ' (ranges from ' + range[0].toExponential(1) + ' to ' + range[1].toExponential(1) + ') for phenotypes where it is defined</p>');
            $('#maf-range p').css('margin-bottom', '0');
        });
    }
})();

$(function() {
    if (!variant.annotation.gnomad) {
	variant.annotation.gnomad = {fin_enrichment: 'No data in gnomAD'}
    } else if (variant.annotation.gnomad.AF_fin === 0) {
	variant.annotation.gnomad.fin_enrichment = 'No FIN in gnomAD'
    } else if (+variant.annotation.gnomad['AC_nfe_nwe'] + +variant.annotation.gnomad['AC_nfe_onf'] + +variant.annotation.gnomad['AC_nfe_seu'] == 0) {
	variant.annotation.gnomad.fin_enrichment = 'No NFEE in gnomAD'
    } else {
	variant.annotation.gnomad.fin_enrichment = +variant.annotation.gnomad['AC_fin'] / +variant.annotation.gnomad['AN_fin'] /
	    ( (+variant.annotation.gnomad['AC_nfe_nwe'] + +variant.annotation.gnomad['AC_nfe_onf'] + +variant.annotation.gnomad['AC_nfe_seu']) / (+variant.annotation.gnomad['AN_nfe_nwe'] + +variant.annotation.gnomad['AN_nfe_onf'] + +variant.annotation.gnomad['AN_nfe_seu']) )
    }
    if (!isNaN(parseFloat(variant.annotation.gnomad.fin_enrichment)) && isFinite(variant.annotation.gnomad.fin_enrichment)) {
	variant.annotation.gnomad.fin_enrichment = variant.annotation.gnomad.fin_enrichment.toFixed(3)
    }
    var af_fin = window.variant.annotation.gnomad.AF_fin
    if (af_fin && !isNaN(parseFloat(af_fin)) && isFinite(af_fin)) {
	af_fin = af_fin.toExponential(1)
    }
    var af_popmax = window.variant.annotation.gnomad.AF_popmax
    if (af_popmax && !isNaN(parseFloat(af_popmax)) && isFinite(af_popmax)) {
	af_popmax = af_popmax.toExponential(1)
    }
    if (window.browser.startsWith('FINNGEN')) {
	if (af_fin !== undefined) {
	    $('#gnomad').html('<p style="text-decoration: underline;" title="' + _.template($('#gnomad-tooltip-template').html())({v:window.variant}) + '" data-toggle="tooltip">AF in gnomAD genomes 2.1: FIN ' + af_fin + ', POPMAX ' + af_popmax + ', FIN enrichment vs. NFEE: ' + window.variant.annotation.gnomad.fin_enrichment + '</p>')
	} else {
	    $('#gnomad').html('<p>No data found in gnomAD 2.1.1</p>')
	}
    } else {
	$('#gnomad').html('<p>Frequency in gnomAD genomes 2.1.1: ' + Object.keys(window.variant.annotation.gnomad).filter(g => g.startsWith('AF')).map(g => g + ': ' + window.variant.annotation.gnomad[g]).join(', ') + '</p>')
    }
    $('#gnomad p').css('margin-bottom', '0');
});

(function() {
    if (!(window.variant.annotation.annot && window.variant.annotation.annot.INFO)) return
    var isnum = function(d) { return typeof d == "number"; };
    var infos = Object.keys(window.variant.annotation.annot).filter(function(key) { 
         return key.indexOf('INFO_') === 0
    }).map(function(k) {
        return window.variant.annotation.annot[k]  
    });
    var range = d3.extent(infos);
    $(function() {
	var info_html = '<p style="text-decoration: underline;" title="' + _.template($('#info-tooltip-template').html())({v:window.variant}) + '" data-toggle="tooltip">INFO ' + (window.variant.annotation.annot && window.variant.annotation.annot.INFO && window.variant.annotation.annot.INFO.toFixed(3)) || 'NA'
	if (range[1] !== undefined) {
	    info_html += ' (ranges in genotyping batches from ' + range[0].toFixed(3) + ' to ' + range[1].toFixed(3) + ')</p>'
	} else {
	    info_html += '</p>'
	}
	$('#info-range').html(info_html)
        $('#info-range p').css('margin-bottom', '0');
    });
    
})();

(function() {
    if (window.variant.annotation.annot && window.variant.annotation.annot.most_severe) {
	$(function() {
	    $('#most_severe').html('<p>Most severe consequence: ' + window.variant.annotation.annot.most_severe.replace(/_/g, ' ') + '<p>')
            $('#most_severe p').css('margin-bottom', '0');
	})
    }
})();

(function() {
    if (window.variant.annotation.annot && window.variant.annotation.annot.AC_Hom != undefined) {
	$(function() {
	    $('#hom').html('<p>Number of alt homozygotes: ' + +(window.variant.annotation.annot.AC_Hom)/2 + '<p>')
            $('#hom p').css('margin-bottom', '0');
	})
    }
})();

// Check Clinvar and render link.
(function() {
    var clinvar_api_template = _.template('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=<%= chr %>[Chromosome]%20AND%20<%= pos %>[Base%20Position%20for%20Assembly%20GRCh38]&retmode=json');
    var clinvar_api_url = clinvar_api_template(window.variant);

    var clinvar_link_template = _.template('https://www.ncbi.nlm.nih.gov/clinvar?term=<%= chr %>[Chromosome]%20AND%20<%= pos %>[Base%20Position%20for%20Assembly%20GRCh38]');
    var clinvar_link_url = clinvar_link_template(window.variant);

    $.getJSON(clinvar_api_url).done(function(result) {
        if (result.esearchresult.count !== "0") {
            // It's in ClinVar
            $('#clinvar-link').html(', <a href="{URL}" target="_blank">Clinvar</a>'.replace('{URL}', clinvar_link_url));
        }
    });
})();

(function() {
    console.log(variant)
    var rsid = window.variant.annotation.annot.rsids || window.variant.annotation.rsids
    if (!rsid) return
    rsid = rsid.split(',')[0]
    $.getJSON('https://grch37.rest.ensembl.org/variation/human/' + rsid + '?content-type=application/json')
        .done(function(result) {
            if (result.mappings && result.mappings[0]) {
                var map = result.mappings[0];
                var url = "http://pheweb.sph.umich.edu/SAIGE-UKB/variant/" + map.seq_region_name + "-" + map.start + "-" + window.variant.ref + "-" + window.variant.alt
                $('#ukbb-link').html(', <a href=' + url + ' target="_blank">UMich UK Biobank</a>')
            }
        })
})();

// Check PubMed for each rsid and render link.
if (window.variant.annotation.annot.rsids || window.variant.annotation.rsids) {
    (function() {
        var pubmed_api_template = _.template('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=1&retmode=xml&term=<%= rsid %>');
        var pubmed_link_template = _.template('https://www.ncbi.nlm.nih.gov/pubmed/?term=<%= rsid %>');
        var rsids = (window.variant.annotation.annot.rsids || window.variant.annotation.rsids).split(','); // There's usually just one rsid.
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
    var data = _.filter(window.results, function(pheno) { return !!pheno.pval });
    data = _.sortBy(data, function(pheno) { return pheno.pval; });
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

    var pheno = new URL(window.location.href).searchParams.get('pheno')
    if (pheno) {
	$('#search').val(pheno)
        $('#search').focus()
        var st = $('#stream_table').data('st')
        st.search($('#search')[0].value)
    }
});

$(function () {
    $("#export").click( function (event) {
    exportTableToCSV.apply(this, [$('#stream_table'),window.variant.varid.replace(/ |,|/g,"") + "_phenotype_associations.tsv",window.var_top_pheno_export_fields])
  });
})

$(function () {
    var maxLogLogP = d3.max(window.results, function(d) { return d.pScaled });
    if (maxLogLogP >= window.vis_conf.loglog_threshold) {
	$("#loglog-note").append("<span>p-values smaller than 1e-" + window.vis_conf.loglog_threshold + " are shown on a log-log scale</span>");
	$("#loglog-note").css("display", "inline-block");
    }
})

$(function () {
    $('[data-toggle="tooltip"]').tooltip({
        html: true,
        animation: false,
        container: 'body',
        placement: 'bottom'
    })
});
