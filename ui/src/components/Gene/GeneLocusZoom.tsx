import React, { useState, useContext, useEffect } from "react";
import {
  Dashboard,
  DataSources,
  populate,
  positionIntToString,
  Layout,
} from "locuszoom";
import { GeneContext, GeneState } from "./GeneContext";
import commonLoading from "../../common/CommonLoading";
import { resolveURL } from "../Configuration/configurationModel";
import { add_dashboard_button } from "../Region/LocusZoom/RegionLocus";
import { clinvar_layout } from "../Region/LocusZoom/RegionLayouts";
import { ConfigurationWindow } from "../Configuration/configurationModel";
import { Plot } from "locuszoom";
import { Gene } from "./geneModel";
import {Phenotype} from "../../common/commonModel";

const element_id: string = "lz-1";

declare let window: ConfigurationWindow;
const config = window?.config;
const application = config?.application;
const lz_config: Gene.LzConfiguration = config?.userInterface?.gene?.lz_config;

const tooltip_html: string =
  lz_config?.tooltip_html ||
  `
  <strong>{{association:id}}</strong><br/>
  <strong>{{association:rsid}}</strong><br/>
  <strong>{{association:most_severe}}</strong><br/>
  <table>
  <tbody
    <tr>
       <td>phenotype</td>
       <td><strong>PHENO</strong></td>
    </tr>
    <tr>
      <td>p-value</td>
      <td><strong>{{association:pvalue|scinotation}}</strong></td>
    </tr>
    <tr>
      <td>beta</td>
      <td><strong>{{association:beta}}</strong> ({{association:sebeta}})</td>
    </tr>
    <tr>
      <td>-log10(p)</td>
      <td><strong>{{association:mlogp|scinotation}}</strong></td>
    </tr>
    <tr>
      <td>MAF</td>
      <td><strong>{{association:maf|percent}}</strong></td>
    </tr>
    <tr>
      <td>MAF controls</td>
      <td><strong>{{association:maf_controls|percent}}</strong></td>
    </tr>
    <tr>
      <td>MAF cases</td>
      <td><strong>{{association:maf_cases|percent}}</strong><br></td>
    <tr>
      <td>FIN enrichment</td>
      <td><strong>{{association:fin_enrichment}}</strong></td>
    </tr>
    <tr>
      <td>INFO</td>
      <td><strong>{{association:INFO}}</strong></td>
    </tr>
  </tbody>
  </table>
  `;

const default_assoc_fields_common: string[] = [
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
  "association:most_severe",
  "association:fin_enrichment",
  "association:INFO",
  "ld:state",
  "ld:isrefvar",
];

const default_assoc_fields_common_binary : string [] = [
  "association:maf_cases",
  "association:maf_controls",
  ...default_assoc_fields_common ]

const default_assoc_fields_common_quantitative : string [] = [
  ...default_assoc_fields_common ]

const assoc_fields_binary : string[] = lz_config?.assoc_fields?.binary ||
    default_assoc_fields_common_binary;
const assoc_fields_quantitative : string[] = lz_config?.assoc_fields?.quantitative ||
    default_assoc_fields_common_quantitative;

export const assoc_fields: (phenotype : Phenotype) => string[] = (phenotype : Phenotype) =>
    phenotype?.is_binary == false? assoc_fields_quantitative : assoc_fields_binary

const ld_panel_version: string =
  lz_config?.ld_panel_version || application?.ld_panel_version || "sisu3";

export  const lz_conf = (phenotype : Phenotype) => {
  return {
    p_threshold: 0.05,
    prob_threshold: 0.0001,
    ld_service: application.ld_service,
    ld_max_window: 5000000,
    ld_ens_pop: "1000GENOMES:phase_3:FIN",
    ld_ens_window: 500,
    assoc_fields: assoc_fields(phenotype),
    tooltip_html: tooltip_html,
  };
}
export const association_layout = (selectedPhenotype: Phenotype): Layout => {
  const phenostring: string =  selectedPhenotype.phenostring;

  return {
    id: "association",
    title: { text: phenostring, x: 55, y: 30 },
    proportional_height: 0.3,
    min_width: 400,
    min_height: 100,
    y_index: 0,
    margin: {
      top: 10,
      right: 50,
      bottom: 40,
      left: 50,
    },
    inner_border: "rgb(210, 210, 210)",
    dashboard: {
      components: [
        {
          type: "toggle_legend",
          position: "right",
          color: "green",
        },
      ],
    },
    axes: {
      x: {
        label_function: "chromosome",
        label_offset: 32,
        tick_format: "region",
        extent: "state",
        render: true,
        label: "Chromosome {{chr}} (Mb)",
      },
      y1: {
        label: "-log10 p-value",
        label_offset: 28,
        render: true,
        label_function: null,
      },
    },
    legend: {
      orientation: "vertical",
      origin: {
        x: 55,
        y: 40,
      },
      hidden: true,
      width: 91.66200256347656,
      height: 138,
      padding: 5,
      label_size: 12,
    },
    interaction: {
      drag_background_to_pan: true,
      drag_x_ticks_to_scale: true,
      drag_y1_ticks_to_scale: true,
      drag_y2_ticks_to_scale: true,
      scroll_to_zoom: true,
      x_linked: true,
      y1_linked: false,
      y2_linked: false,
    },
    data_layers: [
      {
        id: "significance",
        type: "orthogonal_line",
        orientation: "horizontal",
        offset: -Math.log10(5e-8),
      },
      {
        namespace: {
          default: "",
          ld: "ld",
        },
        id: "associationpvalues",
        type: "scatter",
        point_shape: {
          scale_function: "if",
          field: "ld:isrefvar",
          parameters: {
            field_value: 1,
            then: "diamond",
            else: "circle",
          },
        },
        point_size: {
          scale_function: "if",
          field: "ld:isrefvar",
          parameters: {
            field_value: 1,
            then: 80,
            else: 40,
          },
        },
        color: [
          {
            scale_function: "if",
            field: "ld:isrefvar",
            parameters: {
              field_value: 1,
              then: "#9632b8",
            },
          },
          {
            scale_function: "numerical_bin",
            field: "ld:state",
            parameters: {
              breaks: [0, 0.2, 0.4, 0.6, 0.8],
              values: ["#357ebd", "#46b8da", "#5cb85c", "#eea236", "#d43f3a"],
            },
          },
          "#B8B8B8",
        ],
        fill_opacity: 0.7,
        legend: [
          {
            shape: "diamond",
            color: "#9632b8",
            size: 40,
            label: "LD Ref Var",
            class: "lz-data_layer-scatter",
          },
          {
            shape: "circle",
            color: "#d43f3a",
            size: 40,
            label: "1.0 > r² ≥ 0.8",
            class: "lz-data_layer-scatter",
          },
          {
            shape: "circle",
            color: "#eea236",
            size: 40,
            label: "0.8 > r² ≥ 0.6",
            class: "lz-data_layer-scatter",
          },
          {
            shape: "circle",
            color: "#5cb85c",
            size: 40,
            label: "0.6 > r² ≥ 0.4",
            class: "lz-data_layer-scatter",
          },
          {
            shape: "circle",
            color: "#46b8da",
            size: 40,
            label: "0.4 > r² ≥ 0.2",
            class: "lz-data_layer-scatter",
          },
          {
            shape: "circle",
            color: "#357ebd",
            size: 40,
            label: "0.2 > r² ≥ 0.0",
            class: "lz-data_layer-scatter",
          },
          {
            shape: "circle",
            color: "#B8B8B8",
            size: 40,
            label: "no r² data",
            class: "lz-data_layer-scatter",
          },
        ],

        fields: assoc_fields(selectedPhenotype),
        // ldrefvar can only be chosen if "pvalue|neglog10_or_100" is present.  I forget why.
        id_field: "association:id",
        behaviors: {
          onmouseover: [{ action: "set", status: "selected" }],
          onmouseout: [{ action: "unset", status: "selected" }],
          onclick: [
            {
              action: "link",
              href: "/variant/{{association:chr}}-{{association:position}}-{{association:ref}}-{{association:alt}}",
            },
          ],
        },
        tooltip: {
          closable: false,
          show: {
            or: ["highlighted", "selected"],
          },
          hide: {
            and: ["unhighlighted", "unselected"],
          },
          html: tooltip_html.replace("PHENO", phenostring),
        },

        x_axis: {
          field: "association:position",
          axis: 1,
        },
        y_axis: {
          axis: 1,
          field: "association:mlogp",
          floor: 0,
          upper_buffer: 0.1,
          min_extent: [0, 10],
        },
        transition: false,
      },
    ],
    description: null,
    origin: {
      x: 0,
      y: 0,
    },
    proportional_origin: {
      x: 0,
      y: 0,
    },
    background_click: "clear_selections",
  };
};
const gwas_cat_layout = {
  id: "gwas_catalog",
  title: { text: "GWAS catalog + UKBB", x: 55, y: 30 },
  y_index: 2,
  proportional_height: 0.2,
  min_width: 400,
  min_height: 100,
  margin: {
    top: 10,
    right: 50,
    bottom: 20,
    left: 50,
  },
  inner_border: "rgb(210, 210, 210)",
  dashboard: {
    components: [
      {
        type: "toggle_legend",
        position: "right",
        color: "green",
      },
    ],
  },
  axes: {
    x: {
      label_function: "chromosome",
      label_offset: 32,
      tick_format: "region",
      extent: "state",
      render: true,
      label: "Chromosome {{chr}} (Mb)",
    },
    y1: {
      label: "-log10 p-value",
      label_offset: 28,
      render: true,
      label_function: null,
    },
  },
  legend: {
    orientation: "vertical",
    origin: {
      x: 55,
      y: 40,
    },
    hidden: true,
    width: 91.66200256347656,
    height: 138,
    padding: 5,
    label_size: 12,
  },
  interaction: {
    drag_background_to_pan: true,
    drag_x_ticks_to_scale: true,
    drag_y1_ticks_to_scale: true,
    drag_y2_ticks_to_scale: true,
    scroll_to_zoom: true,
    x_linked: true,
    y1_linked: false,
    y2_linked: false,
  },
  data_layers: [
    {
      namespace: {
        gwas_cat: "gwas_cat",
      },
      id: "gwas_cat:id",
      type: "scatter",
      point_shape: {
        scale_function: "if",
        field: "gwas_cat:study",
        parameters: {
          field_value: "UKBB",
          then: "circle",
          else: "diamond",
        },
      },
      color: {
        scale_function: "if",
        field: "gwas_cat:study",
        parameters: {
          field_value: "UKBB",
          then: "#9632b8",
          else: "#d43f3a",
        },
      },
      fill_opacity: 0.7,
      legend: [
        {
          shape: "circle",
          color: "#9632b8",
          size: 40,
          label: "UKBB",
          class: "lz-data_layer-scatter",
        },
        {
          shape: "diamond",
          color: "#d43f3a",
          size: 40,
          label: "GWAS catalog",
          class: "lz-data_layer-scatter",
        },
      ],

      fields: [
        "gwas_cat:id",
        "gwas_cat:or_beta",
        "gwas_cat:pmid",
        "gwas_cat:variant",
        "gwas_cat:chrom",
        "gwas_cat:risk_allele",
        "gwas_cat:risk_frq",
        "gwas_cat:pos",
        "gwas_cat:ref",
        "gwas_cat:alt",
        "gwas_cat:trait",
        "gwas_cat:study",
        "gwas_cat:log_pvalue",
      ],

      id_field: "gwas_cat:variant",
      behaviors: {
        onmouseover: [{ action: "set", status: "selected" }],
        onmouseout: [{ action: "unset", status: "selected" }],
        onclick: [
          {
            action: "link",
            href: "https://www.ncbi.nlm.nih.gov/pubmed/{{gwas_cat:pmid}}",
            target: "_blank",
          },
        ],
      },
      tooltip: {
        closable: false,
        show: { or: ["highlighted", "selected"] },
        hide: { and: ["unhighlighted", "unselected"] },
        html: "Variant:<strong>{{gwas_cat:variant}}</strong><br>\n\nTrait:<strong>{{gwas_cat:trait}}</strong><br>\n\neffect size:<strong>{{gwas_cat:or_beta}}</strong><br>\n\nLog-pval:<strong>{{gwas_cat:log_pvalue}}</strong><br>\n\nRisk allele:<strong>{{gwas_cat:risk_allele}}</strong><br>\n\nRisk allele frq:<strong>{{gwas_cat:risk_frq}}</strong><br>\n\nStudy:<strong>{{gwas_cat:study}}</strong><br>",
      },

      x_axis: { field: "gwas_cat:pos", axis: 1 },
      y_axis: {
        axis: 1,
        field: "gwas_cat:log_pvalue",
        floor: 0,
        upper_buffer: 0.1,
        min_extent: [0, 10],
      },
      transition: false,
    },
  ],
  description: null,
  origin: { x: 0, y: 0 },
  proportional_origin: { x: 0, y: 0 },
  background_click: "clear_selections",
};
const genes_layout = {
  id: "genes",
  proportional_height: 0.2,
  min_width: 420,
  y_index: 1,
  min_height: 100,
  margin: {
    top: 0,
    right: 50,
    bottom: 0,
    left: 50,
  },
  axes: {
    x: { render: false },
    y1: { render: false },
    y2: { render: false },
  },
  interaction: {
    drag_background_to_pan: true,
    scroll_to_zoom: true,
    x_linked: true,
    drag_x_ticks_to_scale: false,
    drag_y1_ticks_to_scale: false,
    drag_y2_ticks_to_scale: false,
    y1_linked: false,
    y2_linked: false,
  },
  dashboard: {
    components: [
      {
        type: "resize_to_data",
        position: "right",
        color: "blue",
      },
    ],
  },
  data_layers: [
    {
      namespace: { gene: "gene" },
      id: "genes",
      type: "genes",
      fields: ["gene:gene"],
      id_field: "gene_id",
      highlighted: {
        onmouseover: "on",
        onmouseout: "off",
      },
      selected: {
        onclick: "toggle_exclusive",
        onshiftclick: "toggle",
      },
      transition: false,
      behaviors: {
        onclick: [{ action: "toggle", status: "selected", exclusive: true }],
        onmouseover: [{ action: "set", status: "highlighted" }],
        onmouseout: [{ action: "unset", status: "highlighted" }],
      },
      tooltip: {
        closable: true,
        show: { or: ["highlighted", "selected"] },
        hide: { and: ["unhighlighted", "unselected"] },
        html: '<h4><strong><i>{{gene_name}}</i></strong></h4><div>Gene ID: <strong>{{gene_id}}</strong></div><div>Transcript ID: <strong>{{transcript_id}}</strong></div><div style="clear: both;"></div><table width="100%"><tr><td style="text-align: right;"><a href="http://exac.broadinstitute.org/gene/{{gene_id}}" target="_new">More data on ExAC</a></td></tr></table>',
      },
      label_font_size: 12,
      label_exon_spacing: 3,
      exon_height: 8,
      bounding_box_padding: 5,
      track_vertical_spacing: 5,
      hover_element: "bounding_box",
      x_axis: { axis: 1 },
      y_axis: { axis: 1 },
    },
  ],
  title: null,
  description: null,
  origin: { x: 0, y: 225 },
  proportional_origin: { x: 0, y: 0.5 },
  background_click: "clear_selections",
  legend: null,
};

const loadLocusZoom = (selectedPhenotype: Phenotype) => {
  const phenotype: string = selectedPhenotype.phenocode;
  const phenostring: string =  selectedPhenotype.phenostring

  const localBase: string = resolveURL(`/api/region/${phenotype}/lz-`);
  const remoteBase: string = "https://portaldev.sph.umich.edu/api/v1/";

  const dataSources = new DataSources();
  dataSources.add("association", [
    "AssociationLZ",
    { url: localBase, params: { source: 3 } },
  ]);
  dataSources.add("gwas_cat", [
    "GWASCatSoureLZ",
    {
      url: `${remoteBase}annotation/gwascatalog/`,
      params: { id: [1, 4], pvalue_field: "log_pvalue" },
    },
  ]);
  dataSources.add("gene", [
    "GeneLZ",
    { url: `${remoteBase}annotation/genes/`, params: { source: 1 } },
  ]);
  dataSources.add("constraint", [
    "GeneConstraintLZ",
    { url: "http://exac.broadinstitute.org/api/constraint" },
  ]);
  // clinvar needs to be added after gene because genes within locuszoom data chain are used for fetching
  dataSources.add("clinvar", [
    "ClinvarDataSourceLZ",
    {
      url: resolveURL("/api/ncbi/"),
      params: { id: [1, 4], pvalue_field: "log_pvalue" },
    },
  ]);

  // region:region Region
  dataSources.add("ld", [
    "FG_LDDataSourceLZ",
    {
      url: application?.ld_service,
      params: {
        id: [1, 4],
        region: { ld_panel_version, lz_conf },
        pvalue_field: "association:pvalue",
        var_id_field: "association:id",
      },
    },
  ]);
  // dashboard components
  Dashboard.Components.add(
    "region",
    function (layout: { class: string; style: string }) {
      const component: Dashboard.Component = new Dashboard.Component.apply(
        this
      );
      component.update = function () {
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
        return this;
      };
      return component;
    }
  );

  add_dashboard_button("link", function (layout) {
    return function () {
      window.location.href = layout.url;
    };
  });

  add_dashboard_button("move", function (layout) {
    // see also the default component `shift_region`
    return function () {
      const start = this.parent_plot.state.start;
      const end = this.parent_plot.state.end;
      const shift = Math.floor(end - start) * layout.direction;
      this.parent_plot.applyState({
        chr: this.parent_plot.state.chr,
        start: start + shift,
        end: end + shift,
      });
    };
  });

  const layout = {
    width: 800,
    height: 500,
    min_width: 800,
    min_height: 500,
    responsive_resize: "both",
    resizable: "responsive",
    // aspect_ratio: 2, // do I want this?
    min_region_scale: 2e4,
    max_region_scale: 5e5,
    panel_boundaries: true,
    mouse_guide: true,
    dashboard: {
      components: [
        {
          type: "link",
          title: "Go to Manhattan Plot",
          text: " Manhattan Plot",
          url: `/pheno/${phenotype}`,
        },
        {
          type: "move",
          text: "<<",
          title: "Shift view 1/4 to the left",
          direction: -0.75,
          group_position: "start",
        },
        {
          type: "move",
          text: "<",
          title: "Shift view 1/4 to the left",
          direction: -0.25,
          group_position: "middle",
        },
        {
          type: "zoom_region",
          button_html: "z+",
          title: "zoom in 2x",
          step: -0.5,
          group_position: "middle",
        },
        {
          type: "zoom_region",
          button_html: "z-",
          title: "zoom out 2x",
          step: 1,
          group_position: "middle",
        },
        {
          type: "move",
          text: ">",
          title: "Shift view 1/4 to the right",
          direction: 0.25,
          group_position: "middle",
        },
        {
          type: "move",
          text: ">>",
          title: "Shift view 3/4 to the right",
          direction: 0.75,
          group_position: "end",
        },
        {
          type: "download",
          position: "right",
        },
      ],
    },
    panels: [],
  };

  const plot: Plot = populate("#lz-1", dataSources, layout);

  plot.addPanel(association_layout(selectedPhenotype));
  plot.addPanel(clinvar_layout);
  plot.addPanel(gwas_cat_layout);
  plot.addPanel(genes_layout);
};

const GeneLocusZoom = () => {
  const { genePhenotype, selectedPhenotype } =
    useContext<Partial<GeneState>>(GeneContext);
  const [loadedLocusZoom, setLoadedLocusZoom] = useState<boolean>(false);
  useEffect(() => {
    if (
      selectedPhenotype !== undefined &&
      selectedPhenotype !== null &&
      !loadedLocusZoom
    ) {
      setLoadedLocusZoom(true);
      loadLocusZoom(selectedPhenotype.pheno);
    }
  }, [genePhenotype, selectedPhenotype, loadedLocusZoom, setLoadedLocusZoom]);

  if (
    genePhenotype !== undefined &&
    genePhenotype !== null &&
    selectedPhenotype !== undefined &&
    selectedPhenotype != null
  ) {
    const {
      region: { start, end, chrom },
    } = genePhenotype;
    const data_region = `${chrom}:${start}-${end}`;
    const body = (
      <div
        id={element_id}
        data-region={data_region}
        className="lz-locuszoom-container lz-container-responsive"
      ></div>
    );
    return body;
  } else {
    return commonLoading;
  }
};
export default GeneLocusZoom;
