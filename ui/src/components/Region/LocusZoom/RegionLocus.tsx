import {
  ComponentsEntity,
  Dashboard,
  DataSources,
  Layout,
  Plot,
  populate,
  positionIntToString,
  TransformationFunctions,
} from "locuszoom";
import {
  association_layout,
  clinvar_layout,
  colocalization_layout,
  finemapping_layout,
  genes_layout,
  gwas_cat_layout,
  panel_layouts,
  region_layout,
} from "./RegionLayouts";

import { ConfigurationWindow } from "../../Configuration/configurationModel";
import {
  ClinvarDataSource,
  FG_LDDataSource,
  GWASCatSource,
} from "./RegionCustomLocuszooms";
import { Region } from "../RegionModel";
import { resolveURL } from "../../Configuration/configurationModel";
import { isFinngenServer } from "../../Finngen/finngenUtilities";

declare let window: ConfigurationWindow;
const application = window?.config?.application;
const config = window?.config?.userInterface?.region;

TransformationFunctions.set<number, number>("neglog10_or_100", (x: number) =>
  x === 0 ? 100 : -Math.log(x) / Math.LN10
);
TransformationFunctions.set<string | null | undefined, string>(
  "na",
  (x: string | null | undefined) => x ?? "NA"
);

TransformationFunctions.set<number, number>("log_pvalue", (x: number) => x);

TransformationFunctions.set<number, number>("logneglog", function (x: number) {
  console.assert(
    this.params &&
      this.params &&
      this.params.region &&
      this.params.region.vis_conf,
    "missing vis_conf"
  );
  let pScaled: number = -Math.log10(x);
  if (pScaled > config.vs_configuration.loglog_threshold) {
    pScaled =
      (config.vs_configuration.loglog_threshold * Math.log10(pScaled)) /
      Math.log10(config.vs_configuration.loglog_threshold);
  }
  return pScaled;
});

TransformationFunctions.set<number, string>("percent", function (n: number) {
  if (n === 1) {
    return "100%";
  }
  let x: string = (n * 100).toPrecision(2);
  if (x.indexOf(".") !== -1) {
    x = x.replace(/0+$/, "");
  }
  if (x.endsWith(".")) {
    x = x.substr(0, x.length - 1);
  }
  return x + "%";
});

const truncate =
  (max_length: number, dots: string) =>
  (s: string): string => {
    console.assert(
      max_length > dots.length,
      `invalid dot '${dots}' and length '${max_length}' combination.`
    );
    let result: string;
    if (s.length > max_length) {
      result = s.substring(0, max_length - dots.length) + dots;
    } else {
      result = s;
    }
    return result;
  };

const sign = (value: number) => {
  let result: "positive" | "negative" | "zero";
  if (value > 0) {
    result = "positive";
  } else if (value < 0) {
    result = "negative";
  } else {
    result = "zero";
  }
  return result;
};
TransformationFunctions.set<number, "positive" | "negative" | "zero">(
  "sign",
  sign
);
TransformationFunctions.set<string, string>("truncate", truncate(20, "..."));

export interface LocusZoomContext {
  plot: Plot;
  dataSources: DataSources;
}

// dashboard components
export function add_dashboard_button(
  name: string,
  func: (layout: ComponentsEntity) => { bind: (a: any) => any }
) {
  Dashboard.Components.add(name, function (layout: ComponentsEntity) {
    Dashboard.Component.apply(this, arguments as any);
    this.update = function () {
      if (this.button) return this;
      this.button = new Dashboard.Component.Button(this)
        .setColor(layout.color)
        .setText(layout.text)
        .setTitle(layout.title)
        .setOnclick(func(layout).bind(this));
      this.button.show();
      return this.update();
    };
    return this;
  });
}
interface ConditionalParams {
  dataIndex: number;
  allData: { conditioned_on: boolean; data: any; type: any }[];
  fields: any;
  outnames: any;
  trans: any;
}

const default_configuration = {
  browser: "FINNGEN",
  genome_build: 38,
  ld_panel_version: "sisu4",
  lz_conf: {
    assoc_fields: [
      "association:id",
      "association:chr",
      "association:position",
      "association:ref",
      "association:alt",
      "association:pvalue",
      "association:pvalue|neglog10_or_100",
      "association:mlogp",
      "association:beta",
      "association:sebeta",
      "association:rsid",
      "association:maf",
      "association:maf_cases",
      "association:maf_controls",
      "association:most_severe",
      "association:fin_enrichment",
      "association:INFO",
      "ld:state",
      "ld:isrefvar",
    ],
    ld_ens_pop: "1000GENOMES:phase_3:FIN",
    ld_ens_window: 500,
    ld_max_window: 5000000,
    ld_service: application?.ld_service || "http://api.finngen.fi/api/ld",
    p_threshold: 0.05,
    prob_threshold: 0.0001,
    tooltip_html:
      "\n                   <strong>{{association:id}}</strong><br/>\n                   <strong>{{association:rsid}}</strong><br/>\n                   <strong>{{association:most_severe}}</strong><br/>\n                   <table>\n                      <tbody>\n                        <tr>\n                            <td>phenotype</td>\n                            <td><strong>PHENO</strong></td>\n                        </tr>\n                        <tr>\n                            <td>p-value</td>\n                            <td><strong>{{association:pvalue|scinotation}}</strong></td>\n                        </tr>\n                        <tr>\n                            <td>beta</td>\n                            <td><strong>{{association:beta}}</strong> ({{association:sebeta}})</td>\n                        </tr>\n                        <tr>\n                            <td>MAF</td>\n                            <td><strong>{{association:maf|percent}}</strong></td>\n                        </tr>\n                        <tr>\n                            <td>MAF controls</td>\n                            <td><strong>{{association:maf_controls|percent}}</strong></td>\n                        </tr>\n                        <tr>\n                            <td>MAF cases</td>\n                            <td><strong>{{association:maf_cases|percent}}</strong><br></td>\n                        </tr>\n                        <tr>\n                            <td>FIN enrichment</td>\n                            <td><strong>{{association:fin_enrichment}}</strong></td>\n                        </tr>\n                        <tr>\n                            <td>INFO</td>\n                            <td><strong>{{association:INFO}}</strong></td>\n                        </tr>\n                      </tbody>\n                   </table>",
  },
  tooltip_lztemplate:
    "{{#if rsid}}<strong>{{rsid}}</strong><br>{{/if}}\n{{#if pheno}}phenotype: <strong>{{trait:pheno}}</strong><br>{{/if}}\n{{#if trait:pvalue}}p-value: <strong>{{trait:pvalue|scinotation|formatPValue}}</strong><br>{{/if}}\n{{#if trait:pval}}p-value: <strong>{{trait:pval|scinotation|formatPValue}}</strong><br>{{/if}}\nmlog10p-value: <strong>{{trait:mlogp|scinotation}}</strong><br>\n{{#if beta}}beta: <strong>{{trait:beta}}</strong>{{#if trait:sebeta}} ({{trait:sebeta}}){{/if}}<br>{{/if}}\n{{#if or}}Odds Ratio: <strong>{{or}}</strong><br>{{/if}}\n{{#if af_alt}}AF: <strong>{{af_alt|percent}}</strong><br>{{/if}}\n{{#if af_alt_cases}}AF cases: <strong>{{af_alt_cases|percent}}</strong><br>{{/if}}\n{{#if af_alt_controls}}AF controls: <strong>{{af_alt_controls|percent}}</strong><br>{{/if}}\n{{#if maf}}AF: <strong>{{maf|percent}}</strong><br>{{/if}}\n{{#if maf_cases}}AF cases: <strong>{{maf_cases|percent}}</strong><br>{{/if}}\n{{#if maf_controls}}AF controls: <strong>{{maf_controls|percent}}</strong><br>{{/if}}\n{{#if af}}AF: <strong>{{af|percent}}</strong><br>{{/if}}\n{{#if ac}}AC: <strong>{{ac}}</strong><br>{{/if}}\n{{#if r2}}R2: <strong>{{r2}}</strong><br>{{/if}}\n{{#if tstat}}Tstat: <strong>{{tstat}}</strong><br>{{/if}}\n{{#if n_cohorts}}n_cohorts: <strong>{{n_cohorts}}</strong><br>{{/if}}\n{{#if n_hom_cases}}n_hom_cases: <strong>{{n_hom_cases}}</strong><br>{{/if}}\n{{#if n_hom_ref_cases}}n_hom_ref_cases: <strong>{{n_hom_ref_cases}}</strong><br>{{/if}}\n{{#if n_het_cases}}n_het_cases: <strong>{{n_het_cases}}</strong><br>{{/if}}\n{{#if n_hom_controls}}n_hom_controls: <strong>{{n_hom_controls}}</strong><br>{{/if}}\n{{#if n_hom_ref_controls}}n_hom_ref_controls: <strong>{{n_hom_ref_controls}}</strong><br>{{/if}}\n{{#if n_het_controls}}n_het_controls: <strong>{{n_het_controls}}</strong><br>{{/if}}\n{{#if n_case}}#cases: <strong>{{n_case}}</strong><br>{{/if}}\n{{#if n_control}}#controls: <strong>{{n_control}}</strong><br>{{/if}}\n{{#if num_samples}}#samples: <strong>{{num_samples}}</strong><br>{{/if}}\n",
  vis_conf: {
    info_tooltip_threshold: 0.8,
    loglog_threshold: 10,
    manhattan_colors: ["rgb(53,0,212)", "rgb(40, 40, 40)"],
  },
};

export const init_locus_zoom = (region: Region): LocusZoomContext => {
  // Define LocusZoom Data Sources object
  const localBase: string = resolveURL(
    `/api/region/${region.pheno.phenocode}/lz-`
  );
  const localCondBase: string = resolveURL(
    "/api/conditional_region/" + region.pheno.phenocode + "/lz-"
  );
  const localFMBase: string = resolveURL(
    "/api/finemapped_region/" + region.pheno.phenocode + "/lz-"
  );
  const remoteBase: string = "https://portaldev.sph.umich.edu/api/v1/";
  const dataSources: DataSources = new DataSources();

  const recombSource: number = application.genome_build === 37 ? 15 : 16;
  const geneSource: number = application.genome_build === 37 ? 2 : 1;
  const gwascatSource: Array<number> =
    application.genome_build === 37 ? [2, 3] : [1, 4];

  dataSources.add("association", [
    "AssociationLZ",
    { url: localBase, params: { source: 3 } },
  ]);
  dataSources.add("conditional", [
    "ConditionalLZ",
    {
      url: localCondBase,
      params: {
        trait_fields: [
          "association:pvalue",
          "association:beta",
          "association:sebeta",
          "association:rsid",
        ],
      },
    },
  ]);
  dataSources.add("finemapping", [
    "FineMappingLZ",
    {
      url: localFMBase,
      params: {
        trait_fields: [
          "association:pvalue",
          "association:beta",
          "association:sebeta",
          "association:rsid",
        ],
      },
    },
  ]);
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
                                                    "phenotype1_description" : [] } }`;
  dataSources.add("colocalization", [
    "ColocalizationLZ",
    { url: colocalizationURL },
  ]);
  dataSources.add("gene", [
    "UMichGeneSourceLZ",
    { url: `${remoteBase}annotation/genes/`, params: { source: geneSource } },
  ]);
  dataSources.add("constraint", [
    "GeneConstraintLZ",
    { url: "http://exac.broadinstitute.org/api/constraint" },
  ]);
  dataSources.add(
    "gwas_cat",
    new GWASCatSource({
      url: `${remoteBase}annotation/gwascatalog/`,
      params: { id: gwascatSource, pvalue_field: "log_pvalue" },
    })
  );
  dataSources.add(
    "clinvar",
    new ClinvarDataSource({
      url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
      params: { region: region, id: [1, 4], pvalue_field: "log_pvalue" },
    })
  );
  if (isFinngenServer(application?.ld_service)) {
    dataSources.add(
      "ld",
      new FG_LDDataSource({
        url: application?.ld_service,
        params: {
          id: [1, 4],

          region: { region, ...default_configuration, ...application },
          pvalue_field: "association:pvalue",
          var_id_field: "association:id",
        },
      })
    );
  } else {
    dataSources.add(
      "ld",
      new FG_LDDataSource({
        url: "https://rest.ensembl.org/ld/homo_sapiens/",
        params: {
          id: [1, 4],
          region: { region, ...default_configuration, ...application },
          pvalue_field: "association:pvalue",
          var_id_field: "association:rsid",
        },
      })
    );
  }
  dataSources.add("recomb", [
    "RecombLZ",
    {
      url: `${remoteBase}annotation/recomb/results/`,
      params: { source: recombSource },
    },
  ]);

  Dashboard.Components.add<ComponentsEntity>(
    "region",
    function (layout: ComponentsEntity) {
      Dashboard.Component.apply(this, arguments as any);
      this.update = function () {
        if (
          !isNaN(this.parent_plot.state.chr) &&
          !isNaN(this.parent_plot.state.start) &&
          !isNaN(this.parent_plot.state.end) &&
          this.parent_plot.state.chr != null &&
          this.parent_plot.state.start != null &&
          this.parent_plot.state.end != null
        ) {
          this.selector.style("display", null);
          this.selector.text(
            "chr" +
              this.parent_plot.state.chr.toString() +
              ": " +
              positionIntToString(
                this.parent_plot.state.start,
                6,
                true
              ).replace(" ", "") +
              " - " +
              positionIntToString(this.parent_plot.state.end, 6, true).replace(
                " ",
                ""
              )
          );
        } else {
          this.selector.style("display", "none");
        }
        if (layout.class) {
          this.selector.attr("class", layout.class);
        }
        if (layout.style) {
          this.selector.style(layout.style);
        }
      };
      return this as Dashboard.Component;
    }
  );

  add_dashboard_button("link", function (layout: ComponentsEntity) {
    return () => {
      if (layout.url) {
        window.location.href = layout.url;
      }
    };
  });

  add_dashboard_button("move", function (layout: ComponentsEntity) {
    // see also the sefault component `shift_region`
    return function () {
      var start = this.parent_plot.state.start;
      var end = this.parent_plot.state.end;
      var shift = Math.floor(end - start) * (layout?.direction || 0);
      this.parent_plot.applyState({
        chr: this.parent_plot.state.chr,
        start: start + shift,
        end: end + shift,
      });
    };
  });

  const plot: Plot = populate("#lz-1", dataSources, region_layout(region));

  plot.addPanel(association_layout(region));
  plot.addPanel(clinvar_layout);
  plot.addPanel(gwas_cat_layout(region));
  plot.addPanel(genes_layout(region));
  plot.addPanel(colocalization_layout(region));

  region.cond_fm_regions?.forEach((r) => {
    if (r.type === "susie" || r.type === "finemap") {
      if (!plot.panels["finemapping"]) {
        plot.addPanel(finemapping_layout(region));
      }
    } else {
      const layout: ((region: Region) => Layout) | undefined =
        panel_layouts[r.type];
      console.assert(
        typeof layout != undefined,
        `${r.type} missing layout for type`
      );
      layout && plot.addPanel(layout(region));
    }
  });

  return { plot, dataSources };
};
