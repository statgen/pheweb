'use strict';

// DEPENDENCIES: This js depends on custom_locuszoom.js and region_layouts.js which need to be included first in html files. We are moving to webpack to take care of the dependencies and this documentation is
// an interim reminder

window.init_locus_zoom = (region) => {
    // Define LocusZoom Data Sources object
    /*
    window.region= region
    window.pheno = region.pheno
    window.lz_conf = region.lz_conf
    window.genome_build = region.genome_build
    window.vis_conf = vis_conf
    */
    var localBase = "/api/region/" + window.pheno.phenocode + "/lz-";
    var localCondBase = "/api/conditional_region/" + window.pheno.phenocode + "/lz-";
    var localFMBase = "/api/finemapped_region/" + window.pheno.phenocode + "/lz-";
    var remoteBase = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources = new LocusZoom.DataSources();

    var gene_source = window.genome_build == 37 ? 2 : 1
    var recomb_source = window.genome_build == 37 ? 15 : 16
    var gwascat_source = window.genome_build == 37 ? [2,3] : [1,4]
    
    data_sources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    data_sources.add("conditional", ["ConditionalLZ", {url: localCondBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    data_sources.add("finemapping", ["FineMappingLZ", {url: localFMBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    data_sources.add("gene", ["GeneLZ", {url:remoteBase + "annotation/genes/", params:{source:gene_source}}])
    data_sources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])
    // clinvar needs to be added after gene because genes within locuszoom data chain are used for fetching
    data_sources.add("gwas_cat", new LocusZoom.Data.GWASCatSource({url: remoteBase + "annotation/gwascatalog/", params: { id:gwascat_source ,pvalue_field: "log_pvalue" }}));
    data_sources.add("clinvar", new LocusZoom.Data.ClinvarDataSource({url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/", params: { id:[1,4] ,pvalue_field: "log_pvalue" }}));
    if (window.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "/api/ld", params: { id:[1,4] ,pvalue_field: "association:pvalue", "var_id_field":"association:id" }}));
    } else {
	data_sources.add("ld", new LocusZoom.Data.FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/", params: { id:[1,4] ,pvalue_field: "association:pvalue", "var_id_field":"association:rsid" }}));
    }	
    data_sources.add("recomb", ["RecombLZ", { url: remoteBase + "annotation/recomb/results/", params: {source: recomb_source} }]);

    var scatters = ['association', 'conditional', 'finemapping', 'gwas_cat']

    LocusZoom.TransformationFunctions.set("neglog10_or_100", function(x) {
        if (x === 0) return 100;
        var log = -Math.log(x) / Math.LN10;
        return log;
    });

    LocusZoom.TransformationFunctions.set("log_pvalue", function(x) {
        return x
    });

    LocusZoom.TransformationFunctions.set("logneglog", function(x) {
	var pScaled = -Math.log10(x)
	if (pScaled > window.vis_conf.loglog_threshold) {
	    pScaled = window.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(window.vis_conf.loglog_threshold)
	}
	return pScaled
    })

    // dashboard components
    LocusZoom.Dashboard.Components.add("region", function(layout){
        LocusZoom.Dashboard.Component.apply(this, arguments);
        this.update = function(){
            if (!isNaN(this.parent_plot.state.chr) && !isNaN(this.parent_plot.state.start) && !isNaN(this.parent_plot.state.end)
                && this.parent_plot.state.chr != null && this.parent_plot.state.start != null && this.parent_plot.state.end != null){
                this.selector.style("display", null);
                this.selector.text(
                    'chr' + this.parent_plot.state.chr.toString() + ': ' +
                    LocusZoom.positionIntToString(this.parent_plot.state.start, 6, true).replace(' ','') + ' - ' +
                    LocusZoom.positionIntToString(this.parent_plot.state.end, 6, true).replace(' ', ''));
            } else {
                this.selector.style("display", "none");
            }
            if (layout.class){ this.selector.attr("class", layout.class); }
            if (layout.style){ this.selector.style(layout.style); }
            return this;
        };
    });

    function add_dashboard_button(name, func) {
        LocusZoom.Dashboard.Components.add(name, function(layout){
            LocusZoom.Dashboard.Component.apply(this, arguments);
            this.update = function(){
                if (this.button)
                    return this;
                this.button = new LocusZoom.Dashboard.Component.Button(this)
                    .setColor(layout.color).setText(layout.text).setTitle(layout.title)
                    .setOnclick(func(layout).bind(this));
                this.button.show();
                return this.update();
            };
        });
    }

    add_dashboard_button('link', function(layout) {
        return function() {
            window.location.href = layout.url;
        };
    });
    add_dashboard_button('move', function(layout) {
        // see also the default component `shift_region`
        return function() {
            var start = this.parent_plot.state.start;
            var end = this.parent_plot.state.end;
            var shift = Math.floor(end - start) * layout.direction;
            this.parent_plot.applyState({
                chr: this.parent_plot.state.chr,
                start: start + shift,
                end: end + shift
            });
        }
    });
        
    window.debug.data_sources = data_sources;
    //window.debug.layout = layout;
    //window.debug.assoc_data_layer = layout.panels[0].data_layers[2];

    window.show_conditional = function(index) {
	var params = data_sources.sources.conditional.params
	params.dataIndex = index
	var panel = window.plot.panels.conditional
	panel.setTitle('conditioned on ' + params.allData[index].conditioned_on)
	panel.data_layers.associationpvalues.data = data_sources.sources.conditional.parseArraysToObjects(params.allData[index].data, params.fields, params.outnames, params.trans)
	panel.data_layers.associationpvalues.render()
	$('#cond_options label').each((i, tag) => {
	    if (i === index) {
		tag.classList.add('active')
	    } else {
		tag.classList.remove('active')
	    }
	});
	update_mouseover('conditional')
	$('#cond_options label')[index].classList.add('active')
    }

    window.show_finemapping = function(method) {
 	var params = data_sources.sources.finemapping.params
	params.dataIndex = params.allData.reduce((acc, cur, i) => cur.type == method ? i : acc, -1)
	var panel = window.plot.panels.finemapping
	panel.setTitle(method + ' credible sets')
	panel.data_layers.associationpvalues.data = data_sources.sources.finemapping.parseArraysToObjects(params.allData[params.dataIndex].data, params.fields, params.outnames, params.trans)
	panel.data_layers.associationpvalues.render()
	$('#finemapping_options label').each((i, tag) => {
	    if (i === params.dataIndex) {
		tag.classList.add('active')
	    } else {
		tag.classList.remove('active')
	    }
	});
	update_mouseover('finemapping')
	$('#finemapping_options label')[params.dataIndex].classList.add('active')
    }

    window.update_mouseover = function(key) {
	var params = data_sources.sources[key].params
	params.lookup = {}
	var dots = d3.selectAll("[id='lz-1." + key + ".associationpvalues.data_layer'] path")
	dots.each((d, i) => {
	    params.lookup[d[key + ':id']] = i
	});
	var scatters_in = scatters.filter(key2 => key2 != key && window.plot.panels[key2])
	dots.on('mouseover', (d, i) => {
	    scatters_in.forEach(key2 => {
		var idx = data_sources.sources[key2].params.lookup &&
		    data_sources.sources[key2].params.lookup[d[key + ':id']]
		if (idx !== undefined) {
		    d3.selectAll("[id='lz-1." + key2 + ".associationpvalues.data_layer'] path").filter((d, j) => j == idx).classed('lz-highlight', true)
		}
	    })
	})
	dots.on('mouseout', (d, i) => {
	    scatters_in.forEach(key2 => {
		d3.selectAll("[id='lz-1." + key2 + ".associationpvalues.data_layer'] path").classed('lz-highlight', false)
	    })
	})
    }
    
    $(function() {

        // Populate the div with a LocusZoom plot using the default layout
        window.plot = LocusZoom.populate("#lz-1", data_sources, window.region_layout);
	window.plot.addPanel(window.panel_layouts.association)
	window.plot.addPanel(window.panel_layouts.clinvar)
	window.plot.addPanel(window.panel_layouts.gwas_cat)
	window.plot.addPanel(window.panel_layouts.genes)
	window.cond_fm_regions.forEach(region => {
	    if (region.type == 'susie' || region.type == 'finemap') {
		if (!window.plot.panels['finemapping']) {
		    window.plot.addPanel(window.panel_layouts['finemapping'])
		}
	    } else {
		window.plot.addPanel(window.panel_layouts[region.type])
	    }
	})

	window.plot.panels['clinvar'].on('data_rendered', function() {
	    update_mouseover('clinvar')
	})
	
	scatters.filter(key => window.plot.panels[key]).forEach(key => {
	    window.plot.panels[key].on("data_rendered", function() {
		console.log(key + ' rendered')
		update_mouseover(key)
		if (key == 'conditional') {
		    var params = data_sources.sources[key].params
		    this.setTitle('conditioned on ' + params.allData[params.dataIndex].conditioned_on)
		}
		if (key == 'finemapping') {
		    var params = data_sources.sources[key].params
		    this.setTitle(params.allData[params.dataIndex].type + ' credible sets')
		}
		this.setDimensions(this.layout.width, 200);
		this.parent.setDimensions();
		this.parent.panel_ids_by_y_index.forEach(function(id) {
		    if (id == 'clinvar') {// || id == 'genes') {
			this.parent.panels[id].layout.proportional_height = 0.02
		    } else if (id != 'genes') {
			if (this.parent.panel_ids_by_y_index.length > 4) {
			    this.parent.panels[id].layout.proportional_height = 0.1
			} else {
			    this.parent.panels[id].layout.proportional_height = 0.15
			}
		    }
		}.bind(this));
		// after all have been rendered, scale gene panel to height
		// have not found another way to keep panels heights somewhat ok
		// this now assumes that other panels have been rendered before the last assoc/cond/finemap panel
		this.rendered = true
		var nRendered = scatters.reduce((acc, cur) => acc + (window.plot.panels[cur] && window.plot.panels[cur].rendered === true ? 1 : 0), 0)
		if (nRendered == scatters.length) {
		    console.log('scaling gene panel')
		    window.plot.panels.genes.scaleHeightToData()
		}
		this.parent.positionPanels();
	    })
	})

	if (window.cond_fm_regions && window.cond_fm_regions.length > 0) {
	    var cond_regions = window.cond_fm_regions.filter(region => region.type == 'conditional')
	    var n_cond_signals = cond_regions.length > 0 ? cond_regions[0].n_signals : 0
	    var summary_html = window.cond_fm_regions.map(region =>
							  region.type == 'finemap' ?
							  '<span>' + region.n_signals + ' ' + region.type + ' signals (prob. ' + region.n_signals_prob.toFixed(3) + ')</span><br/>' :
							  '<span>' + region.n_signals + ' ' + region.type + ' signals</span><br/>'
							 ).join('') + n_cond_signals > 0 ? '<span>Conditional analysis results are approximations from summary stats. Conditioning is repeated until no signal p < 1e-6 is left.</span><br/>' : ''
	    $('#region_summary').html(summary_html)
	    if (n_cond_signals > 1) {
		var opt_html = window.cond_fm_regions.filter(region => region.type == 'conditional')[0].paths.map((path, i) => 
	          '<label onClick="show_conditional(' + i + ')" data-cond-i="' + i + '" class="btn btn-primary' + (i === 0 ? ' active' : '') + '"><span>' + (i+1) + '</span></label>'
                ).join('\n')
		$('#cond_options').html('<p>Show conditioned on ' + opt_html + ' variants<span></p>')
	    }
	    if (window.cond_fm_regions.filter(region => region.type == 'susie' || region.type == 'finemap').length > 1) {
		var opt_html = window.cond_fm_regions.filter(region => region.type == 'susie' || region.type == 'finemap').map((region, i) => 
	          '<label onClick="show_finemapping(\'' + region.type + '\')' + '" class="btn btn-primary' + (i === 0 ? ' active' : '') + '"><span>' + region.type + '</span></label>'
                ).join('\n')
		$('#finemapping_options').html('<p>Show fine-mapping from ' + opt_html + '<span></p>')
	    }
	}
    });
};
