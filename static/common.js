$(function() {
    var autocomplete_bloodhound = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('display'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        identify: function(sugg) { return sugg.display; }, // maybe allows Bloodhound to `.get()`  objects
        remote: {
            url: '/api/autocomplete?query=%QUERY',
            wildcard: '%QUERY'
        },
        local: [{"display":"1:16344683-C-T","url":"/variant/1:16344683-C-T","value":"1:16344683-C-T"},{"display":"340 (Migraine)","url":"/pheno/340","value":"340"},{"display":"Polyneuropathy due to drugs (316.1)","url":"/pheno/316.1","value":"316.1"}]
    });

    function autocomplete_bloodhound_with_defaults(query, sync, async) {
      if (query.trim() === '') {
        sync(autocomplete_bloodhound.all());
      } else {
        autocomplete_bloodhound.search(query, sync, async);
      }
    }

    $('.typeahead').typeahead({
        hint: false,
        highlight: true,
        minLength: 0,
      }, {
        name: 'autocomplete',
        source: autocomplete_bloodhound_with_defaults,
        display: 'value',
        limit: Infinity,
        templates: {
           suggestion: _.template("<div><%= display %></div>"),
           empty: "<div style='padding:3px 20px'>No matches found.</div>"
        }
    });

    $('.typeahead').bind('typeahead:select', function(ev, suggestion) {
        window.location.href = suggestion.url;
    });
});
