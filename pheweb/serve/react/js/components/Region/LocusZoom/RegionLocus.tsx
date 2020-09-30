import { positionIntToString, Layouts , Data , createCORSPromise , DataSources , TransformationFunctions , Dashboard , populate, Plot, Layout, LayoutComponentsEntity } from 'locuszoom';
import { region_layout ,  association_layout , genes_layout , clinvar_layout , gwas_cat_layout , finemapping_layout , colocalization_layout , panel_layouts } from './RegionLayouts';
import { FG_LDDataSource , GWASCatSource , ClinvarDataSource } from './RegionCustomLocuszooms';
import { Region, CondFMRegions } from '../RegionModel';
import { selectAll} from 'd3' ;
import { assert } from 'console';


TransformationFunctions.set("neglog10_or_100", function(x : number) {
    if (x === 0) return 100;
    var log = -Math.log(x) / Math.LN10;
    return log;
});

TransformationFunctions.set<number,number>("log_pvalue", function(x: number) { return x });

TransformationFunctions.set<number,number>("logneglog", function(x : number) {
    console.assert(this.params && this.params && this.params.region && this.params.region.vis_conf , 'missing vis_conf')
    var pScaled : number = -Math.log10(x)
    if (pScaled > this.params.region.vis_conf.loglog_threshold) {
        pScaled = this.params.region.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(this.params.region.vis_conf.loglog_threshold)
    }
    return pScaled
})

TransformationFunctions.set<number,string>("percent", function(n : number) {
    if (n === 1) { return "100%"; }
    var x : string = (n*100).toPrecision(2);
    if (x.indexOf('.') !== -1) { x = x.replace(/0+$/, ''); }
    if (x.endsWith('.')) { x = x.substr(0, x.length-1); }
    return x + '%';
});

const truncate = (max_length : number,dots : string) =>  (s :string) : string => {
    console.assert(max_length > dots.length, `invalid dot '${dots}' and length '${max_length}' combination.`);
    let result : string;
    if(s.length > max_length){
            result = s.substring(0,max_length - dots.length) + dots ;
    } else {
        result = s;
    }
    return result;
}

const sign = (value : number) => { let result : "positive"|"negative"|"zero";
                                   if(value > 0){ result = "positive";  }
                                   else if(value < 0){ result = "negative"; }
                                   else { result = "zero"; }
                                   return result;
                                }
TransformationFunctions.set<number,"positive"|"negative"|"zero">("sign",sign);
TransformationFunctions.set<string,string>("truncate", truncate(20,"..."));


export interface LocusZoomContext {
    plot : Plot
    dataSources : DataSources
}
// dashboard components
function add_dashboard_button(name : string, func : (layout : LayoutComponentsEntity) => { bind : (a : any) => any }) {
    Dashboard.Components.add(name, function(layout : LayoutComponentsEntity){
        Dashboard.Component.apply(this, arguments);
        this.update = function(){
            if (this.button)return this;
            this.button = new Dashboard.Component.Button(this)
                .setColor(layout.color).setText(layout.text).setTitle(layout.title)
                .setOnclick(func(layout).bind(this));
            this.button.show();
            return this.update();
        };
    });
};
interface ConditionalParams {
    dataIndex : number ,
    allData :{ conditioned_on : boolean ,
               data : any ,
               type: any } [],
    fields : any,
    outnames : any,
    trans : any,
};

export const init_locus_zoom = (region : Region) : LocusZoomContext =>  {
    // Define LocusZoom Data Sources object
    const localBase : string = `/api/region/${region.pheno.phenocode}/lz-`;
    const localCondBase : string = "/api/conditional_region/" + region.pheno.phenocode + "/lz-";
    const localFMBase : string = "/api/finemapped_region/" + region.pheno.phenocode + "/lz-";
    const localColocalizationBase : string = "/api/colocalization/" + region.pheno.phenocode + "/lz-";
    const remoteBase : string = "https://portaldev.sph.umich.edu/api/v1/";
    const dataSources : DataSources = new DataSources();

    const recombSource : number = region.genome_build == 37 ? 15 : 16
    const geneSource : number = region.genome_build == 37 ? 2 : 1
    const gwascatSource : Array<number> = region.genome_build == 37 ? [2,3] : [1,4]

    dataSources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    dataSources.add("conditional", ["ConditionalLZ", {url: localCondBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    dataSources.add("finemapping", ["FineMappingLZ", {url: localFMBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    const colocalizationURL = `data:,  { "data" : { "causalvariantid" : [] ,
                                                    "position" : [] ,
                                                    "varid" : [] ,
                                                    "beta1" : [] ,
                                                    "beta2" : [] ,
                                                    "pip1" : [] ,
                                                    "pip2" : [] ,
                                                    "variant" : [] ,
                                                    "rsid" : [] ,
                                                    "phenotype1" : [],
                                                    "phenotype1_description" : [] } }`
    dataSources.add("colocalization", ["ColocalizationLZ", {url: colocalizationURL }]);
    dataSources.add("gene", ["GeneLZ", {url: `${remoteBase}annotation/genes/`, params:{source:geneSource}}])
    dataSources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])
    dataSources.add("gwas_cat", new GWASCatSource({url: remoteBase + "annotation/gwascatalog/", params: { id:gwascatSource ,pvalue_field: "log_pvalue" }}));
    dataSources.add("clinvar", new ClinvarDataSource({url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/", params: { region:region , id:[1,4] ,pvalue_field: "log_pvalue" }}));

    if (region.lz_conf.ld_service.toLowerCase() == 'finngen') {
	dataSources.add("ld", new FG_LDDataSource({url: "/api/ld",
						   params: { id:[1,4] ,
							     region: region,
							     pvalue_field: "association:pvalue",
							     var_id_field: "association:id" }}));
    } else {
	dataSources.add("ld", new FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/",
							 params: { id:[1,4] ,
								       region: region,
								       pvalue_field: "association:pvalue",
								       var_id_field: "association:rsid" }}));
    }
    dataSources.add("recomb", ["RecombLZ", { url: `${remoteBase}annotation/recomb/results/`, params: {source: recombSource} }]);

    Dashboard.Components.add<LayoutComponentsEntity>("region", function(layout : LayoutComponentsEntity){
        Dashboard.Component.apply(this, arguments);
        this.update = function(){
            if (!isNaN(this.parent_plot.state.chr) && !isNaN(this.parent_plot.state.start) && !isNaN(this.parent_plot.state.end)
                && this.parent_plot.state.chr != null && this.parent_plot.state.start != null && this.parent_plot.state.end != null){
                this.selector.style("display", null);
                this.selector.text(
                    'chr' + this.parent_plot.state.chr.toString() + ': ' +
                    positionIntToString(this.parent_plot.state.start, 6, true).replace(' ','') + ' - ' +
                    positionIntToString(this.parent_plot.state.end, 6, true).replace(' ', ''));
            } else {
                this.selector.style("display", "none");
            }
            if (layout.class){ this.selector.attr("class", layout.class); }
            if (layout.style){ this.selector.style(layout.style); }
            return this;
        };
    });

    function update_mouseover(key : string) {
        var params : { lookup : object } = dataSources.sources[key].params
        params.lookup = {}
        var dots = d3.selectAll("[id='lz-1." + key + ".associationpvalues.data_layer'] path")
        dots.each((d, i) => {
            params.lookup[d[key + ':id']] = i
        });
        var scatters_in = scatters.filter(key2 => key2 != key && plot.panels[key2])
        dots.on('mouseover', (d, i) => {
            scatters_in.forEach((key2 : string) => {
                var idx = dataSources.sources[key2].params.lookup &&
                dataSources.sources[key2].params.lookup[d[key + ':id']]
                if (idx !== undefined) {
                    selectAll("[id='lz-1." + key2 + ".associationpvalues.data_layer'] path").filter((d, j) => j == idx).classed('lz-highlight', true)
                }
            })
        })
        dots.on('mouseout', (d, i) => {
            scatters_in.forEach((key2 : string) => {
                selectAll("[id='lz-1." + key2 + ".associationpvalues.data_layer'] path").classed('lz-highlight', false)
            })
        })
    }


    add_dashboard_button('link', function(layout : LayoutComponentsEntity) {
        return () => { if(layout.url) { window.location.href = layout.url }; };
    });

    add_dashboard_button('move', function(layout : LayoutComponentsEntity) {
        // see also the sefault component `shift_region`
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


    const show_conditional = function(index : number) {
        var params : ConditionalParams  = dataSources.sources.conditional.params;
        params.dataIndex = index
        var panel = plot.panels.conditional
        panel.setTitle('conditioned on ' + params.allData[index].conditioned_on)
        panel.data_layers.associationpvalues.data = dataSources.sources.conditional.parseArraysToObjects(params.allData[index].data, params.fields, params.outnames, params.trans)
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


    const show_finemapping = function(method : string) {
        var params : ConditionalParams = dataSources.sources.finemapping.params
        params.dataIndex = params.allData.reduce((acc, cur, i) => cur.type == method ? i : acc, -1)
        var panel = plot.panels.finemapping
        panel.setTitle(method + ' credible sets')
        panel.data_layers.associationpvalues.data = dataSources.sources.finemapping.parseArraysToObjects(params.allData[params.dataIndex].data, params.fields, params.outnames, params.trans)
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


    const plot : Plot = populate("#lz-1", dataSources, region_layout(region));

    plot.addPanel(association_layout(region));
    plot.addPanel(clinvar_layout(region));
    plot.addPanel(gwas_cat_layout(region));
    plot.addPanel(genes_layout(region));
    plot.addPanel(colocalization_layout(region));

    region.cond_fm_regions.forEach(r => {
        if (r.type == 'susie' || r.type == 'finemap') {
            if (!plot.panels['finemapping']) {
                plot.addPanel(finemapping_layout(region));
            }
        } else {
            const layout = panel_layouts.get(r.type);
            console.assert( layout, '`${r.type} missing layout for type`')
            layout && plot.addPanel(layout);
        }
    });

    plot.panels['clinvar'].on('data_rendered', function() {
        update_mouseover('clinvar')
    });

    const scatters : string[] = ['association', 'conditional', 'finemapping', 'gwas_cat', 'colocalization']

    plot.panels['colocalization'].on('data_rendered', () => { console.log('..'); })
    plot.panels['colocalization'].on('element_selection', () => { console.log('.+'); })

    
/*
    scatters.filter(key => plot.panels[key]).forEach(key => {
        plot.panels[key].on("data_rendered", function() {
        console.log(key + ' rendered')
        update_mouseover(key)
        if (key == 'conditional') {
            var params : ConditionalParams = dataSources.sources[key].params
            this.setTitle('Conditioned On ' + params.allData[params.dataIndex].conditioned_on)
        }
        if (key == 'finemapping') {
            var params : ConditionalParams = dataSources.sources[key].params
            this.setTitle(params.allData[params.dataIndex].type + 'Credible Sets')
        }
        this.setDimensions(this.layout.width, 200);
        this.parent.setDimensions();
        this.parent.panel_ids_by_y_index.forEach(function(id : string) {
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
        var nRendered = scatters.reduce((acc, cur) => acc + (plot.panels[cur] && plot.panels[cur].rendered === true ? 1 : 0), 0)
        if (nRendered == scatters.length) {
            console.log('scaling gene panel')
            plot.panels.genes.scaleHeightToData()
        }
        this.parent.positionPanels();
        })
    })
*/
    
    const region_span = (region : CondFMRegions) : string => region.type === 'finemap' ?
            `<span>${region.n_signals} ${region.type} signals (prob. ${region.n_signals_prob.toFixed(3)} </span><br/>` :
            `<span>${region.n_signals} ${region.type} signals</span><br/>`;

    if (region.cond_fm_regions && region.cond_fm_regions.length > 0) {
        var cond_regions = region.cond_fm_regions.filter(region => region.type == 'conditional')
        var n_cond_signals = cond_regions.length > 0 ? cond_regions[0].n_signals : 0

        var summary_region : string = region.cond_fm_regions.map(region_span).join('');
        var summary_message : string = n_cond_signals > 0 ? '<span>Conditional analysis results are approximations from summary stats. Conditioning is repeated until no signal p < 1e-6 is left.</span><br/>' : '';
        var summary_html =  summary_region + summary_message;
        $('#region_summary').html(summary_html)
        if (n_cond_signals > 1) {
            var opt_html = region.cond_fm_regions.filter(r => r.type == 'conditional')[0].paths.map((path, i) =>
              '<label onClick="show_conditional(' + i + ')" data-cond-i="' + i + '" class="btn btn-primary' + (i === 0 ? ' active' : '') + '"><span>' + (i+1) + '</span></label>'
            ).join('\n')
            $('#cond_options').html('<p>Show conditioned on ' + opt_html + ' variants<span></p>')
        }
        if (region.cond_fm_regions.filter(r => r.type == 'susie' || r.type == 'finemap').length > 1) {
            var opt_html = region.cond_fm_regions.filter(r => r.type == 'susie' || r.type == 'finemap').map((r, i) =>
              '<label onClick="show_finemapping(\'' + r.type + '\')' + '" class="btn btn-primary' + (i === 0 ? ' active' : '') + '"><span>' + r.type + '</span></label>'
            ).join('\n')
            $('#finemapping_options').html('<p>Show fine-mapping from ' + opt_html + '<span></p>')
        }
    };


   return { plot , dataSources };
};
