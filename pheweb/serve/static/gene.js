'use strict';

function populate_streamtable(data) {
    $(function() {
        // data = _.sortBy(data, _.property('pval'));
        var template = _.template($('#streamtable-template').html());
        var view = function(p) {
            return template({p: p});
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
            $("<style type='text/css'> .st_pagination { display: None }</style>").appendTo("head");
            options.pagination.next_text = "";
            options.pagination.prev_text = "";
        }

        $('#stream_table').stream_table(options, data);
    });
}
populate_streamtable(window.significant_phenos);


$(function () {
  $("#export").click( function (event) {
    console.log()
    exportTableToCSV.apply(this, [$('#stream_table'),window.gene_symbol + "_top_associations.tsv"])
  });
})

$(function() {
    if (!window.gene_symbol) return
    $.getJSON('http://rest.ensembl.org/xrefs/symbol/human/' + window.gene_symbol + '?content-type=application/json')
        .done(function(result) {
	    var url = 'http://gnomad.broadinstitute.org/gene/' + result[0].id
	    $('#gnomad-link').html(', <a href=' + url + ' target="_blank">gnomAD</a>')
        })
})();
