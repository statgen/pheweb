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
                next_text: '',
                prev_text: '',
                per_page_select: false,
                per_page: 9999999
            }
        }

        $('#stream_table').stream_table(options, data);
    });
}
