import { Layouts , Data , createCORSPromise , DataSources , TransformationFunctions , Dashboard , populate } from 'locuszoom';
import { region_layout ,  association_layout , genes_layout , clinvar_layout , gwas_cat_layout } from './region_layouts';
import { FG_LDDataSource , GWASCatSource , ClinvarDataSource } from './custom_locuszooms';
import { Region } from './components';

TransformationFunctions.set("neglog10_or_100", function(x : number) {
    if (x === 0) return 100;
    var log = -Math.log(x) / Math.LN10;
    return log;
});

TransformationFunctions.set("log_pvalue", function(x: number) {
    return x
});

TransformationFunctions.set("logneglog", function(x) {
console.assert(this.params && this.params && this.params.region && this.params.region.vis_conf , 'missing vis_conf')
var pScaled : number = -Math.log10(x)
if (pScaled > this.params.region.vis_conf.loglog_threshold) {
    pScaled = this.params.region.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(this.params.region.vis_conf.loglog_threshold)
}
return pScaled
})

TransformationFunctions.set("percent", function(n : number) {
    if (n === 1) { return "100%"; }
    var x : string = (n*100).toPrecision(2);
    if (x.indexOf('.') !== -1) { x = x.replace(/0+$/, ''); }
    if (x.endsWith('.')) { x = x.substr(0, x.length-1); }
    return x + '%';
});



export const init_locus_zoom = (region : Region) => {
    // Define LocusZoom Data Sources object
    var localBase : string = `/api/region/${region.pheno.phenocode}/lz-`;
    var localCondBase : string = "/api/conditional_region/" + region.pheno.phenocode + "/lz-";
    var localFMBase : string = "/api/finemapped_region/" + region.pheno.phenocode + "/lz-";
    var remoteBase : string = "https://portaldev.sph.umich.edu/api/v1/";
    var data_sources : DataSources = new DataSources();

    var recomb_source : number = region.genome_build == 37 ? 15 : 16
    var gene_source : number = region.genome_build == 37 ? 2 : 1
    var gwascat_source : Array<number> = region.genome_build == 37 ? [2,3] : [1,4]

    data_sources.add("association", ["AssociationLZ", {url: localBase, params:{source:3}}]);
    data_sources.add("conditional", ["ConditionalLZ", {url: localCondBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    data_sources.add("finemapping", ["FineMappingLZ", {url: localFMBase, params:{trait_fields: ["association:pvalue", "association:beta", "association:sebeta", "association:rsid"]}}]);
    data_sources.add("gene", ["GeneLZ", {url: `${remoteBase}annotation/genes/`, params:{source:gene_source}}])   
    
    data_sources.add("constraint", ["GeneConstraintLZ", { url: "http://exac.broadinstitute.org/api/constraint" }])
    data_sources.add("gwas_cat", new GWASCatSource({url: remoteBase + "annotation/gwascatalog/", params: { id:gwascat_source ,pvalue_field: "log_pvalue" }}));
    data_sources.add("clinvar", new ClinvarDataSource({url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/", params: { region:region , id:[1,4] ,pvalue_field: "log_pvalue" }}));  
    
    if (region.lz_conf.ld_service.toLowerCase() == 'finngen') {
	data_sources.add("ld", new FG_LDDataSource({url: "/api/ld",
							                    params: { id:[1,4] ,
								                region: region,
								                pvalue_field: "association:pvalue",
								                var_id_field: "association:id" }}));
    } else {
	data_sources.add("ld", new FG_LDDataSource({url: "https://rest.ensembl.org/ld/homo_sapiens/",
							 params: { id:[1,4] ,
								       region: region,
								       pvalue_field: "association:pvalue",
								       var_id_field: "association:rsid" }}));
    }
    data_sources.add("recomb", ["RecombLZ", { url: `${remoteBase}annotation/recomb/results/`, params: {source: recomb_source} }]);

    
    // dashboard components
    function add_dashboard_button(name, func) {
        Dashboard.Components.add(name, function(layout){
            Dashboard.Component.apply(this, arguments);
            this.update = function(){
                if (this.button)
                    return this;
                this.button = new Dashboard.Component.Button(this)
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
    
    const plot = populate("#lz-1", data_sources, region_layout(region));
    plot.addPanel(association_layout(region));
    plot.addPanel(clinvar_layout(region));
    plot.addPanel(gwas_cat_layout(region));
    plot.addPanel(genes_layout(region));
};
