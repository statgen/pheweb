'use strict';

function populate_streamtable (phenos) {
  $(function () {
    var template = _.template($('#phenolist-streamtable-template').html());
    var view = function (pheno) {
      return template({p: pheno});
    }
    var $found = $('#phenolist-streamtable-found');
    $found.text(phenos.length + ' phenotypes');

    var callbacks = {
      pagination: function (summary) {
        if ($.trim($('#search').val()).length > 0) {
          $found.text(summary.total + ' matching phenotypes');
        } else {
          $found.text(phenos.length + ' total phenotypes');
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
        per_page: 10,
        per_page_opts: [10],
        per_page_select: true
      },
      fields: ['phenostring']
    };

    $('#stream_table').stream_table(options, phenos);
  })
}

function populate_lof_streamtable (results) {
    $(function () {
    var template = _.template($('#lof-streamtable-template').html());
    var view = function (result) {
      return template({r: result});
    }
    var $found = $('#lof-streamtable-found');
    $found.text(results.length + ' results');

    var callbacks = {
      pagination: function (summary) {
        if ($.trim($('#search-lof').val()).length > 0) {
          $found.text(summary.total + ' matching results');
        } else {
          $found.text(results.length + ' total results');
        }
      }
    }

    var options = {
      view: view,
      search_box: '#search-lof',
      callbacks: callbacks,
      pagination: {
        span: 5,
        next_text: 'Next <span class="glyphicon glyphicon-arrow-right" aria-hidden="true"></span>',
        prev_text: '<span class="glyphicon glyphicon-arrow-left" aria-hidden="true"></span> Previous',
        per_page: 10,
        per_page_opts: [10],
        per_page_select: true
      },
	fields: ['phenostring', 'gene']
    };

    $('#lof_stream_table').stream_table(options, results);
  })
}

$(function () {
  $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
      var target = $(e.target).attr("href"); // activated tab
      if (target === '#phenotypes') {
          $('#search').focus();
          var st = $('#stream_table').data('st');
          st.search($('#search')[0].value);
      } else if (target === '#search-general') {
          $('#query').focus();
      }
  });

  $(document).on('change', 'input:radio[name="options"]', function (event) {
    var st = $('#stream_table').data('st');
    var field = event.target.id.replace('button-', '');
    st.opts.fields = [field];
    st.textFunc = null;
    st.last_search_text = null;
    st.clearAndBuildTextIndex(st.data);
    st.search($('#search')[0].value);
    if (field === 'category') {
      $('#search')[0].placeholder = 'Search for a category';
    } else if (field === 'phenostring') {
      $('#search')[0].placeholder = 'Search for a phenotype';
    }
  });

});
