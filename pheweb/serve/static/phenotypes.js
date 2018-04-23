'use strict';

function populate_streamtable(phenotypes) {
    $(function() {
        // This is mostly copied from <https://michigangenomics.org/health_data.html>.
        var data = phenotypes;
        // data = _.sortBy(data, _.property('pval'));
        var template = _.template($('#streamtable-template').html());
        var view = function(pheno) {
            return template({h: pheno});
        };
        var $found = $('#streamtable-found');
        $found.text(data.length + " phenotypes");

        var callbacks = {
            pagination: function(summary){
                if ($.trim($('#search').val()).length > 0){
                    $found.text(summary.total + " matching phenotypes");
                } else {
                    $found.text(data.length + " phenotypes");
                }
            }
        }

        var options = {
            view: view,
            search_box: '#search',
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
}
