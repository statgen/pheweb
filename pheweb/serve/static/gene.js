'use strict';

function populate_variant_streamtable(data) {

    // data = _.sortBy(data, _.property('pval'));
    var template = _.template($('#streamtable-functional-variants-template').html());
    var view = function(v) {
        return template({v: v});
    };
    
    var options = {
        view: view,
        search_box: false,
        pagination: {
            span: 5,
            next_text: 'Next <span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>',
            prev_text: '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span> Previous',
            per_page_select: false,
            per_page: 10
        }
    }
    
    $("<style type='text/css'> .st_search { display: None }</style>").appendTo("head");
    
    if (data.length <= 10) {
        $("<style type='text/css'> .functional_variants>.st_pagination { display: None }</style>").appendTo("head");
        options.pagination.next_text = "";
        options.pagination.prev_text = "";
    }
    
    $('#stream_table_functional_variants').stream_table(options, data);
}

function populate_streamtable(data) {
    $(function() {
        var template = _.template($('#streamtable-template').html());
        var view = function(p) {
            return template({p: p});
        };

	var fields = function(item) {
	    return [
		item.pheno.phenocode,
		item.pheno.phenostring,
		item.pheno.category,
		item.assoc.rsid
	    ].join(' ')
	}
	
        var options = {
            view: view,
            search_box: '#search',
            pagination: {
                span: 5,
                next_text: 'Next <span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>',
                prev_text: '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span> Previous',
                per_page_select: true,
		per_page_opts: [10],
                per_page: 10
            },
	    fields: fields
        }

        $('#stream_table').stream_table(options, data);
    });
}

function variant_id_to_pheweb_format(variant) {
    var split = variant.split(/:/)
    return split[0].replace('chr', '') + '-' + split.slice(1).join('-')
}


$(function () {
  $("#export").click( function (event) {
    exportTableToCSV.apply(this, [$('#stream_table'),window.gene_symbol + "_top_associations.tsv"])
  });
})

$(function() {
    if (!window.gene_symbol) return
    $.getJSON('http://rest.ensembl.org/xrefs/symbol/human/' + window.gene_symbol + '?content-type=application/json')
        .done(function(result) {
	    var url = 'http://gnomad.broadinstitute.org/gene/' + result[0].id
	    $('#gnomad-link').html(', <a href=' + url + ' target="_blank">gnomAD</a>')
        });
})
