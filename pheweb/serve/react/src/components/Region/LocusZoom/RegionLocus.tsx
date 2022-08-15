import {
    ComponentsEntity,
    Dashboard,
    DataSources,
    Layout,
    Plot,
    populate,
    positionIntToString,
    TransformationFunctions
} from "locuszoom";
import {
    association_layout,
    clinvar_layout,
    colocalization_layout,
    finemapping_layout,
    genes_layout,
    gwas_cat_layout,
    panel_layouts,
    region_layout
} from "./RegionLayouts";
import { ClinvarDataSource, FG_LDDataSource, GWASCatSource } from "./RegionCustomLocuszooms";
import { Region } from "../RegionModel";
import { resolveURL } from "../../Configuration/configurationModel";

TransformationFunctions.set<number,number>("neglog10_or_100", (x : number) => (x === 0)?100:-Math.log(x) / Math.LN10);
TransformationFunctions.set<string | null | undefined,string>("na", (x: string | null | undefined) => x??"NA");
TransformationFunctions.set<number,number>("log_pvalue", (x: number) => x );

TransformationFunctions.set<number,number>("logneglog", function(x : number) {
    console.assert(this.params && this.params && this.params.region && this.params.region.vis_conf ,
              'missing vis_conf')
    let pScaled : number = -Math.log10(x)
    if (pScaled > this.params.region.vis_conf.loglog_threshold) {
        pScaled = this.params.region.vis_conf.loglog_threshold * Math.log10(pScaled) / Math.log10(this.params.region.vis_conf.loglog_threshold)
    }
    return pScaled
})

TransformationFunctions.set<number,string>("percent", function(n : number) {
    if (n === 1) { return "100%"; }
    let x : string = (n*100).toPrecision(2);
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
export function add_dashboard_button(name : string, func : (layout : ComponentsEntity) => { bind : (a : any) => any }) {
    Dashboard.Components.add(name, function(layout : ComponentsEntity){
        Dashboard.Component.apply(this, arguments as any);
        this.update = function(){
            if (this.button)return this;
            // @ts-ignore
            this.button = new Dashboard.Component.Button(this)
                .setColor(layout.color).setText(layout.text).setTitle(layout.title)
                .setOnclick(func(layout).bind(this));
            this.button.show();
            return this.update();
        };
        return this;
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
    const localBase : string = resolveURL(`/api/region/${region.pheno.phenocode}/lz-`);
    const localCondBase : string = resolveURL("/api/conditional_region/" + region.pheno.phenocode + "/lz-");
    const localFMBase : string = resolveURL("/api/finemapped_region/" + region.pheno.phenocode + "/lz-");
    const remoteBase : string = "https://portaldev.sph.umich.edu/api/v1/";
    const dataSources : DataSources = new DataSources();

    const recombSource : number = region.genome_build === 37 ? 15 : 16
    const geneSource : number = region.genome_build === 37 ? 2 : 1
    const gwascatSource : Array<number> = region.genome_build === 37 ? [2,3] : [1,4]

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

    if (region.lz_conf?.ld_service?.toLowerCase() === 'finngen') {
	dataSources.add("ld", new FG_LDDataSource({url: resolveURL("/api/ld"),
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

    Dashboard.Components.add<ComponentsEntity>("region", function(layout : ComponentsEntity) {
        Dashboard.Component.apply(this, arguments as any);
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
        };
        return this as Dashboard.Component;
    });

    add_dashboard_button('link', function(layout : ComponentsEntity) {
        return () => { if(layout.url) { window.location.href = layout.url }; };
    });

    add_dashboard_button('move', function(layout : ComponentsEntity) {
        // see also the sefault component `shift_region`
        return function() {
            var start = this.parent_plot.state.start;
            var end = this.parent_plot.state.end;
            var shift = Math.floor(end - start) * (layout?.direction|| 0);
            this.parent_plot.applyState({
                chr: this.parent_plot.state.chr,
                start: start + shift,
                end: end + shift
            });
        }
    });

    const plot : Plot = populate("#lz-1", dataSources, region_layout(region));

    plot.addPanel(association_layout(region));
    plot.addPanel(clinvar_layout);
    plot.addPanel(gwas_cat_layout(region));
    plot.addPanel(genes_layout(region));
    plot.addPanel(colocalization_layout(region));

    region.cond_fm_regions?.forEach(r => {
        if (r.type === 'susie' || r.type === 'finemap') {
            if (!plot.panels['finemapping']) {
                plot.addPanel(finemapping_layout(region));
            }
        } else {
            const layout :  ((region: Region) => Layout) | undefined = panel_layouts[r.type];
            console.assert(typeof layout != undefined, `${r.type} missing layout for type`)
            layout && plot.addPanel(layout(region));
        }
    });

   return { plot , dataSources };
};
