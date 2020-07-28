/* global LocusZoom */
'use strict';

var LZ_SIG_THRESHOLD_LOGP = 7.301; // -log10(.05/1e6)

/**
 * Manage known layouts for all parts of the LocusZoom plot
 *
 * This registry allows for layouts to be reused and customized many times on a page, using a common base pattern.
 *   It handles the work of ensuring that each new instance of the layout has no shared state with other copies.
 *
 * @class
 */
LocusZoom.Layouts = (function () {
    var obj = {};
    var layouts = {
        'plot': {},
        'panel': {},
        'data_layer': {},
        'dashboard': {},
        'dashboard_components': {},
        'tooltip': {}
    };

    /**
     * Generate a layout configuration object
     * @param {('plot'|'panel'|'data_layer'|'dashboard'|'tooltip')} type The type of layout to retrieve
     * @param {string} name Identifier of the predefined layout within the specified type
     * @param {object} [modifications] Custom properties that override default settings for this layout
     * @returns {object} A JSON-serializable object representation
     */
    obj.get = function (type, name, modifications) {
        if (typeof type != 'string' || typeof name != 'string') {
            throw new Error('invalid arguments passed to LocusZoom.Layouts.get, requires string (layout type) and string (layout name)');
        } else if (layouts[type][name]) {
            // Get the base layout
            var layout = LocusZoom.Layouts.merge(modifications || {}, layouts[type][name]);
            // If "unnamespaced" is true then strike that from the layout and return the layout without namespacing
            if (layout.unnamespaced) {
                delete layout.unnamespaced;
                return JSON.parse(JSON.stringify(layout));
            }
            // Determine the default namespace for namespaced values
            var default_namespace = '';
            if (typeof layout.namespace == 'string') {
                default_namespace = layout.namespace;
            } else if (typeof layout.namespace == 'object' && Object.keys(layout.namespace).length) {
                if (typeof layout.namespace.default != 'undefined') {
                    default_namespace = layout.namespace.default;
                } else {
                    default_namespace = layout.namespace[Object.keys(layout.namespace)[0]].toString();
                }
            }
            default_namespace += default_namespace.length ? ':' : '';
            // Apply namespaces to layout, recursively
            var applyNamespaces = function (element, namespace) {
                if (namespace) {
                    if (typeof namespace == 'string') {
                        namespace = { default: namespace };
                    }
                } else {
                    namespace = { default: '' };
                }
                if (typeof element == 'string') {
                    var re = /\{\{namespace(\[[A-Za-z_0-9]+\]|)\}\}/g;
                    var match, base, key, resolved_namespace;
                    var replace = [];
                    while ((match = re.exec(element)) !== null) {
                        base = match[0];
                        key = match[1].length ? match[1].replace(/(\[|\])/g, '') : null;
                        resolved_namespace = default_namespace;
                        if (namespace != null && typeof namespace == 'object' && typeof namespace[key] != 'undefined') {
                            resolved_namespace = namespace[key] + (namespace[key].length ? ':' : '');
                        }
                        replace.push({ base: base, namespace: resolved_namespace });
                    }
                    for (var r in replace) {
                        element = element.replace(replace[r].base, replace[r].namespace);
                    }
                } else if (typeof element == 'object' && element != null) {
                    if (typeof element.namespace != 'undefined') {
                        var merge_namespace = (typeof element.namespace == 'string') ? { default: element.namespace } : element.namespace;
                        namespace = LocusZoom.Layouts.merge(namespace, merge_namespace);
                    }
                    var namespaced_element, namespaced_property;
                    for (var property in element) {
                        if (property === 'namespace') {
                            continue;
                        }
                        namespaced_element = applyNamespaces(element[property], namespace);
                        namespaced_property = applyNamespaces(property, namespace);
                        if (property !== namespaced_property) {
                            delete element[property];
                        }
                        element[namespaced_property] = namespaced_element;
                    }
                }
                return element;
            };
            layout = applyNamespaces(layout, layout.namespace);
            // Return the layout as valid JSON only
            return JSON.parse(JSON.stringify(layout));
        } else {
            throw new Error('layout type [' + type + '] name [' + name + '] not found');
        }
    };

    /** @private */
    obj.set = function (type, name, layout) {
        if (typeof type != 'string' || typeof name != 'string' || typeof layout != 'object') {
            throw new Error('unable to set new layout; bad arguments passed to set()');
        }
        if (!layouts[type]) {
            layouts[type] = {};
        }
        if (layout) {
            return (layouts[type][name] = JSON.parse(JSON.stringify(layout)));
        } else {
            delete layouts[type][name];
            return null;
        }
    };

    /**
     * Register a new layout definition by name.
     *
     * @param {string} type The type of layout to add. Usually, this will be one of the predefined LocusZoom types,
     *   but if you pass a different name, this method will automatically create the new `type` bucket
     * @param {string} name The identifier of the newly added layout
     * @param {object} [layout] A JSON-serializable object containing configuration properties for this layout
     * @returns The JSON representation of the newly created layout
     */
    obj.add = function (type, name, layout) {
        return obj.set(type, name, layout);
    };

    /**
     * List all registered layouts
     * @param [type] Optionally narrow the list to only layouts of a specific type; else return all known layouts
     * @returns {*}
     */
    obj.list = function (type) {
        if (!layouts[type]) {
            var list = {};
            Object.keys(layouts).forEach(function (type) {
                list[type] = Object.keys(layouts[type]);
            });
            return list;
        } else {
            return Object.keys(layouts[type]);
        }
    };

    /**
     * A helper method used for merging two objects. If a key is present in both, takes the value from the first object
     *   Values from `default_layout` will be cleanly copied over, ensuring no references or shared state.
     *
     * Frequently used for preparing custom layouts. Both objects should be JSON-serializable.
     *
     * @param {object} custom_layout An object containing configuration parameters that override or add to defaults
     * @param {object} default_layout An object containing default settings.
     * @returns {object} The custom layout is modified in place and also returned from this method.
     */
    obj.merge = function (custom_layout, default_layout) {
        if (typeof custom_layout !== 'object' || typeof default_layout !== 'object') {
            throw new Error('LocusZoom.Layouts.merge only accepts two layout objects; ' + (typeof custom_layout) + ', ' + (typeof default_layout) + ' given');
        }
        for (var property in default_layout) {
            if (!default_layout.hasOwnProperty(property)) {
                continue;
            }
            // Get types for comparison. Treat nulls in the custom layout as undefined for simplicity.
            // (javascript treats nulls as "object" when we just want to overwrite them as if they're undefined)
            // Also separate arrays from objects as a discrete type.
            var custom_type = custom_layout[property] === null ? 'undefined' : typeof custom_layout[property];
            var default_type = typeof default_layout[property];
            if (custom_type === 'object' && Array.isArray(custom_layout[property])) {
                custom_type = 'array';
            }
            if (default_type === 'object' && Array.isArray(default_layout[property])) {
                default_type = 'array';
            }
            // Unsupported property types: throw an exception
            if (custom_type === 'function' || default_type === 'function') {
                throw new Error('LocusZoom.Layouts.merge encountered an unsupported property type');
            }
            // Undefined custom value: pull the default value
            if (custom_type === 'undefined') {
                custom_layout[property] = JSON.parse(JSON.stringify(default_layout[property]));
                continue;
            }
            // Both values are objects: merge recursively
            if (custom_type === 'object' && default_type === 'object') {
                custom_layout[property] = LocusZoom.Layouts.merge(custom_layout[property], default_layout[property]);
                continue;
            }
        }
        return custom_layout;
    };

    return obj;
})();


/**
 * Tooltip Layouts
 * @namespace LocusZoom.Layouts.tooltips
 */

LocusZoom.Layouts.add('tooltip', 'standard_association', {
    namespace: { 'assoc': 'assoc' },
    closable: true,
    show: { or: ['highlighted', 'selected'] },
    hide: { and: ['unhighlighted', 'unselected'] },
    html: '<strong>{{{{namespace[assoc]}}variant|htmlescape}}</strong><br>'
        + 'P Value: <strong>{{{{namespace[assoc]}}log_pvalue|logtoscinotation|htmlescape}}</strong><br>'
        + 'Ref. Allele: <strong>{{{{namespace[assoc]}}ref_allele|htmlescape}}</strong><br>'
        + '<a href="javascript:void(0);" onclick="LocusZoom.getToolTipDataLayer(this).makeLDReference(LocusZoom.getToolTipData(this));">Make LD Reference</a><br>'
});

LocusZoom.Layouts.add('tooltip', 'standard_association_with_label', function() {
    // Add a special "toggle label" button to the base tooltip. This must be used in tandem with a custom layout
    //   directive (label.filters should check a boolean annotation field called "lz_show_label").
    var base = LocusZoom.Layouts.get('tooltip', 'standard_association', { unnamespaced: true });
    base.html += '<a href="javascript:void(0);" onclick="var item = LocusZoom.getToolTipData(this), layer = LocusZoom.getToolTipDataLayer(this); var current = layer.getElementAnnotation(item, \'lz_show_label\'); layer.setElementAnnotation(item, \'lz_show_label\', !current ); layer.parent_plot.applyState();">Toggle label</a>';
    return base;
}());

LocusZoom.Layouts.add('tooltip', 'standard_genes', {
    closable: true,
    show: { or: ['highlighted', 'selected'] },
    hide: { and: ['unhighlighted', 'unselected'] },
    html: '<h4><strong><i>{{gene_name|htmlescape}}</i></strong></h4>'
        + 'Gene ID: <a href="https://useast.ensembl.org/homo_sapiens/Gene/Summary?g={{gene_id|htmlescape}}&db=core" target="_blank" rel="noopener">{{gene_id|htmlescape}}</a><br>'
        + 'Transcript ID: <strong>{{transcript_id|htmlescape}}</strong><br>'
        + '{{#if pLI}}<table>'
        + '<tr><th>Constraint</th><th>Expected variants</th><th>Observed variants</th><th>Const. Metric</th></tr>'
        + '<tr><td>Synonymous</td><td>{{exp_syn}}</td><td>{{obs_syn}}</td><td>z = {{syn_z}}<br>o/e = {{oe_syn}} ({{oe_syn_lower}} - {{oe_syn_upper}})</td></tr>'
        + '<tr><td>Missense</td><td>{{exp_mis}}</td><td>{{obs_mis}}</td><td>z = {{mis_z}}<br>o/e = {{oe_mis}} ({{oe_mis_lower}} - {{oe_mis_upper}})</td></tr>'
        + '<tr><td>pLoF</td><td>{{exp_lof}}</td><td>{{obs_lof}}</td><td>pLI = {{pLI}}<br>o/e = {{oe_lof}} ({{oe_lof_lower}} - {{oe_lof_upper}})</td></tr>'
        + '</table><br>{{/if}}'
        + '<a href="https://gnomad.broadinstitute.org/gene/{{gene_id|htmlescape}}" target="_blank" rel="noopener">More data on gnomAD</a>'
});

LocusZoom.Layouts.add('tooltip', 'catalog_variant', {
    namespace: { 'assoc': 'assoc', 'catalog': 'catalog' },
    closable: true,
    show: { or: ['highlighted', 'selected'] },
    hide: { and: ['unhighlighted', 'unselected'] },
    html: '<strong>{{{{namespace[catalog]}}variant|htmlescape}}</strong><br>'
        + 'Catalog entries: <strong>{{n_catalog_matches|htmlescape}}</strong><br>'
        + 'Top Trait: <strong>{{{{namespace[catalog]}}trait|htmlescape}}</strong><br>'
        + 'Top P Value: <strong>{{{{namespace[catalog]}}log_pvalue|logtoscinotation}}</strong><br>'
        // User note: if a different catalog is used, the tooltip will need to be replaced with a different link URL
        + 'More: <a href="https://www.ebi.ac.uk/gwas/search?query={{{{namespace[catalog]}}rsid|htmlescape}}" target="_blank" rel="noopener">GWAS catalog</a> / <a href="https://www.ncbi.nlm.nih.gov/snp/{{{{namespace[catalog]}}rsid|htmlescape}}" target="_blank" rel="noopener">dbSNP</a>'
});

LocusZoom.Layouts.add('tooltip', 'coaccessibility', {
    namespace: { 'access': 'access' },
    closable: true,
    show: { or: ['highlighted', 'selected'] },
    hide: { and: ['unhighlighted', 'unselected'] },
    // TODO: Is there a more generic terminology? (eg not every technique is in terms of cis-regulatory element)
    html: '<strong>Regulatory element</strong><br>' +
        '{{{{namespace[access]}}start1|htmlescape}}-{{{{namespace[access]}}end1|htmlescape}}<br>' +
        '<strong>Promoter</strong><br>' +
        '{{{{namespace[access]}}start2|htmlescape}}-{{{{namespace[access]}}end2|htmlescape}}<br>' +
        '{{#if {{namespace[access]}}target}}<strong>Target</strong>: {{{{namespace[access]}}target|htmlescape}}<br>{{/if}}' +
        '<strong>Score</strong>: {{{{namespace[access]}}score|htmlescape}}'
});

/**
 * Data Layer Layouts: represent specific information from a data source
 * @namespace Layouts.data_layer
 */

LocusZoom.Layouts.add('data_layer', 'significance', {
    id: 'significance',
    type: 'orthogonal_line',
    orientation: 'horizontal',
    offset: LZ_SIG_THRESHOLD_LOGP
});

LocusZoom.Layouts.add('data_layer', 'recomb_rate', {
    namespace: { 'recomb': 'recomb' },
    id: 'recombrate',
    type: 'line',
    fields: ['{{namespace[recomb]}}position', '{{namespace[recomb]}}recomb_rate'],
    z_index: 1,
    style: {
        'stroke': '#0000FF',
        'stroke-width': '1.5px'
    },
    x_axis: {
        field: '{{namespace[recomb]}}position'
    },
    y_axis: {
        axis: 2,
        field: '{{namespace[recomb]}}recomb_rate',
        floor: 0,
        ceiling: 100
    }
});

LocusZoom.Layouts.add('data_layer', 'association_pvalues', {
    namespace: { 'assoc': 'assoc', 'ld': 'ld' },
    id: 'associationpvalues',
    type: 'scatter',
    point_shape: {
        scale_function: 'if',
        field: '{{namespace[ld]}}isrefvar',
        parameters: {
            field_value: 1,
            then: 'diamond',
            else: 'circle'
        }
    },
    point_size: {
        scale_function: 'if',
        field: '{{namespace[ld]}}isrefvar',
        parameters: {
            field_value: 1,
            then: 80,
            else: 40
        }
    },
    color: [
        {
            scale_function: 'if',
            field: '{{namespace[ld]}}isrefvar',
            parameters: {
                field_value: 1,
                then: '#9632b8'
            }
        },
        {
            scale_function: 'numerical_bin',
            field: '{{namespace[ld]}}state',
            parameters: {
                breaks: [0, 0.2, 0.4, 0.6, 0.8],
                values: ['#357ebd', '#46b8da', '#5cb85c', '#eea236', '#d43f3a']
            }
        },
        '#B8B8B8'
    ],
    legend: [
        { shape: 'diamond', color: '#9632b8', size: 40, label: 'LD Ref Var', class: 'lz-data_layer-scatter' },
        { shape: 'circle', color: '#d43f3a', size: 40, label: '1.0 > r² ≥ 0.8', class: 'lz-data_layer-scatter' },
        { shape: 'circle', color: '#eea236', size: 40, label: '0.8 > r² ≥ 0.6', class: 'lz-data_layer-scatter' },
        { shape: 'circle', color: '#5cb85c', size: 40, label: '0.6 > r² ≥ 0.4', class: 'lz-data_layer-scatter' },
        { shape: 'circle', color: '#46b8da', size: 40, label: '0.4 > r² ≥ 0.2', class: 'lz-data_layer-scatter' },
        { shape: 'circle', color: '#357ebd', size: 40, label: '0.2 > r² ≥ 0.0', class: 'lz-data_layer-scatter' },
        { shape: 'circle', color: '#B8B8B8', size: 40, label: 'no r² data', class: 'lz-data_layer-scatter' }
    ],
    label: null,
    fields: ['{{namespace[assoc]}}variant', '{{namespace[assoc]}}position', '{{namespace[assoc]}}log_pvalue', '{{namespace[assoc]}}log_pvalue|logtoscinotation', '{{namespace[assoc]}}ref_allele', '{{namespace[ld]}}state', '{{namespace[ld]}}isrefvar'],
    id_field: '{{namespace[assoc]}}variant',
    z_index: 2,
    x_axis: {
        field: '{{namespace[assoc]}}position'
    },
    y_axis: {
        axis: 1,
        field: '{{namespace[assoc]}}log_pvalue',
        floor: 0,
        upper_buffer: 0.10,
        min_extent: [0, 10]
    },
    behaviors: {
        onmouseover: [
            { action: 'set', status: 'highlighted' }
        ],
        onmouseout: [
            { action: 'unset', status: 'highlighted' }
        ],
        onclick: [
            { action: 'toggle', status: 'selected', exclusive: true }
        ],
        onshiftclick: [
            { action: 'toggle', status: 'selected' }
        ]
    },
    tooltip: LocusZoom.Layouts.get('tooltip', 'standard_association', { unnamespaced: true })
});

LocusZoom.Layouts.add('data_layer', 'coaccessibility', {
    namespace: { 'access': 'access' },
    id: 'coaccessibility',
    type: 'arcs',
    fields: ['{{namespace[access]}}start1', '{{namespace[access]}}end1', '{{namespace[access]}}start2', '{{namespace[access]}}end2', '{{namespace[access]}}id', '{{namespace[access]}}target', '{{namespace[access]}}score'],
    match: { send: '{{namespace[access]}}target', receive: '{{namespace[access]}}target' },
    id_field: '{{namespace[access]}}id',
    filters: [
        ['{{namespace[access]}}score', '!=', null],
        // ['{{namespace[access]}}score', '>', 0.5], // Potentially useful but very situational
    ],
    color: [
        {
            field: 'lz_highlight_match', // Special field name whose presence triggers custom rendering
            scale_function: 'if',
            parameters: {
                field_value: true,
                then: '#ff0000',
            },
        },
        {
            field: 'lz_highlight_match', // Special field name whose presence triggers custom rendering
            scale_function: 'if',
            parameters: {
                field_value: false,
                then: '#EAE6E6',
            },
        },
        {
            scale_function: 'ordinal_cycle',
            parameters: {
                values: d3.scale.category20().range(), // Array of colors that work well together
            }
        }
    ],
    x_axis: {
        field1: '{{namespace[access]}}start1',
        field2: '{{namespace[access]}}start2',
    },
    y_axis: {
        axis: 1,
        field: '{{namespace[access]}}score',
        upper_buffer: 0.1,
        min_extent: [0, 1]
    },
    behaviors: {
        onmouseover: [
            { action: 'set', status: 'highlighted' }
        ],
        onmouseout: [
            { action: 'unset', status: 'highlighted' }
        ],
        onclick: [
            { action: 'toggle', status: 'selected', exclusive: true }
        ],
        onshiftclick: [
            { action: 'toggle', status: 'selected' }
        ]
    },
    tooltip: LocusZoom.Layouts.get('tooltip', 'coaccessibility', { unnamespaced: true })
});

LocusZoom.Layouts.add('data_layer', 'association_pvalues_catalog', function () {
    // Slightly modify an existing layout
    var l = LocusZoom.Layouts.get('data_layer', 'association_pvalues', {
        unnamespaced: true,
        id: 'associationpvaluescatalog',
        fill_opacity: 0.7
    });
    l.tooltip.html += '{{#if {{namespace[catalog]}}rsid}}<br><a href="https://www.ebi.ac.uk/gwas/search?query={{{{namespace[catalog]}}rsid|htmlescape}}" target="_blank" rel="noopener">See hits in GWAS catalog</a>{{/if}}';
    l.namespace.catalog = 'catalog';
    l.fields.push('{{namespace[catalog]}}rsid', '{{namespace[catalog]}}trait', '{{namespace[catalog]}}log_pvalue');
    return l;
}());

LocusZoom.Layouts.add('data_layer', 'phewas_pvalues', {
    namespace: { 'phewas': 'phewas' },
    id: 'phewaspvalues',
    type: 'category_scatter',
    point_shape: 'circle',
    point_size: 70,
    tooltip_positioning: 'vertical',
    id_field: '{{namespace[phewas]}}id',
    fields: ['{{namespace[phewas]}}id', '{{namespace[phewas]}}log_pvalue', '{{namespace[phewas]}}trait_group', '{{namespace[phewas]}}trait_label'],
    x_axis: {
        field: '{{namespace[phewas]}}x',  // Synthetic/derived field added by `category_scatter` layer
        category_field: '{{namespace[phewas]}}trait_group',
        lower_buffer: 0.025,
        upper_buffer: 0.025
    },
    y_axis: {
        axis: 1,
        field: '{{namespace[phewas]}}log_pvalue',
        floor: 0,
        upper_buffer: 0.15
    },
    color: [{
        field: '{{namespace[phewas]}}trait_group',
        scale_function: 'categorical_bin',
        parameters: {
            categories: [],
            values: [],
            null_value: '#B8B8B8'
        }
    }],
    fill_opacity: 0.7,
    tooltip: {
        closable: true,
        show: { or: ['highlighted', 'selected'] },
        hide: { and: ['unhighlighted', 'unselected'] },
        html: [
            '<strong>Trait:</strong> {{{{namespace[phewas]}}trait_label|htmlescape}}<br>',
            '<strong>Trait Category:</strong> {{{{namespace[phewas]}}trait_group|htmlescape}}<br>',
            '<strong>P-value:</strong> {{{{namespace[phewas]}}log_pvalue|logtoscinotation|htmlescape}}<br>'
        ].join('')
    },
    behaviors: {
        onmouseover: [
            { action: 'set', status: 'highlighted' }
        ],
        onmouseout: [
            { action: 'unset', status: 'highlighted' }
        ],
        onclick: [
            { action: 'toggle', status: 'selected', exclusive: true }
        ],
        onshiftclick: [
            { action: 'toggle', status: 'selected' }
        ]
    },
    label: {
        text: '{{{{namespace[phewas]}}trait_label|htmlescape}}',
        spacing: 6,
        lines: {
            style: {
                'stroke-width': '2px',
                'stroke': '#333333',
                'stroke-dasharray': '2px 2px'
            }
        },
        filters: [
            {
                field: '{{namespace[phewas]}}log_pvalue',
                operator: '>=',
                value: 20
            }
        ],
        style: {
            'font-size': '14px',
            'font-weight': 'bold',
            'fill': '#333333'
        }
    }
});

LocusZoom.Layouts.add('data_layer', 'genes', {
    namespace: { 'gene': 'gene', 'constraint': 'constraint' },
    id: 'genes',
    type: 'genes',
    fields: ['{{namespace[gene]}}all', '{{namespace[constraint]}}all'],
    id_field: 'gene_id',
    behaviors: {
        onmouseover: [
            { action: 'set', status: 'highlighted' }
        ],
        onmouseout: [
            { action: 'unset', status: 'highlighted' }
        ],
        onclick: [
            { action: 'toggle', status: 'selected', exclusive: true }
        ],
        onshiftclick: [
            { action: 'toggle', status: 'selected' }
        ]
    },
    tooltip: LocusZoom.Layouts.get('tooltip', 'standard_genes', { unnamespaced: true })
});

LocusZoom.Layouts.add('data_layer', 'annotation_catalog', {
    // Identify GWAS hits that are present in the GWAS catalog
    namespace: { 'assoc': 'assoc', 'catalog': 'catalog' },
    id: 'annotation_catalog',
    type: 'annotation_track',
    id_field: '{{namespace[catalog]}}variant',
    x_axis: {
        field: '{{namespace[assoc]}}position'
    },
    color: '#0000CC',
    fields: [
        '{{namespace[assoc]}}variant', '{{namespace[assoc]}}chromosome', '{{namespace[assoc]}}position',
        '{{namespace[catalog]}}variant', '{{namespace[catalog]}}rsid', '{{namespace[catalog]}}trait',
        '{{namespace[catalog]}}log_pvalue', '{{namespace[catalog]}}pos'
    ],
    filters: [
        // Specify which points to show on the track. Any selection must satisfy ALL filters
        ['{{namespace[catalog]}}rsid', '!=', null],
        ['{{namespace[catalog]}}log_pvalue', '>', LZ_SIG_THRESHOLD_LOGP]
    ],
    behaviors: {
        onmouseover: [
            { action: 'set', status: 'highlighted' }
        ],
        onmouseout: [
            { action: 'unset', status: 'highlighted' }
        ],
        onclick: [
            { action: 'toggle', status: 'selected', exclusive: true }
        ],
        onshiftclick: [
            { action: 'toggle', status: 'selected' }
        ]
    },
    tooltip: LocusZoom.Layouts.get('tooltip', 'catalog_variant', { unnamespaced: true }),
    tooltip_positioning: 'top'
});

/**
 * Individual dashboard buttons
 * @namespace Layouts.dashboard_components
 */
LocusZoom.Layouts.add('dashboard_components', 'ldlz2_pop_selector', {
    // **Note**: this widget is aimed at the LDLZ2 datasource, and the UM 1000G LDServer. Older LZ usages
    //  (on the original LD data source) will not work with these population names.
    type: 'set_state',
    position: 'right',
    color: 'blue',
    button_html: 'LD Population: ',
    show_selected: true,
    button_title: 'Select LD Population: ',
    state_field: 'ld_pop',
    // This list below is hardcoded to work with the UMich LDServer, default 1000G populations
    //  It can be customized to work with other LD servers that specify population differently
    // https://portaldev.sph.umich.edu/ld/genome_builds/GRCh37/references/1000G/populations
    options: [
        { display_name: 'ALL (default)', value: 'ALL' },
        { display_name: 'AFR', value: 'AFR' },
        { display_name: 'AMR', value: 'AMR' },
        { display_name: 'EAS', value: 'EAS' },
        { display_name: 'EUR', value: 'EUR' },
        { display_name: 'SAS', value: 'SAS' }
    ]
});

/**
 * Dashboard Layouts: Collections of toolbar buttons etc
 * @namespace Layouts.dashboard
 */
LocusZoom.Layouts.add('dashboard', 'standard_panel', {
    components: [
        {
            type: 'remove_panel',
            position: 'right',
            color: 'red',
            group_position: 'end'
        },
        {
            type: 'move_panel_up',
            position: 'right',
            group_position: 'middle'
        },
        {
            type: 'move_panel_down',
            position: 'right',
            group_position: 'start',
            style: { 'margin-left': '0.75em' }
        }
    ]
});

LocusZoom.Layouts.add('dashboard', 'standard_plot', {
    components: [
        {
            type: 'title',
            title: 'LocusZoom',
            subtitle: '<a href="https://statgen.github.io/locuszoom/" target="_blank" rel="noopener">v' + LocusZoom.version + '</a>',
            position: 'left'
        },
        {
            type: 'download',
            position: 'right'
        }
    ]
});

LocusZoom.Layouts.add('dashboard', 'region_nav_plot', function () {
    var region_nav_plot_dashboard = LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true });
    region_nav_plot_dashboard.components.push(
        {
            type: 'shift_region',
            step: 500000,
            button_html: '>>',
            position: 'right',
            group_position: 'end'
        }, {
            type: 'shift_region',
            step: 50000,
            button_html: '>',
            position: 'right',
            group_position: 'middle'
        },
        {
            type: 'zoom_region',
            step: 0.2,
            position: 'right',
            group_position: 'middle'
        },
        {
            type: 'zoom_region',
            step: -0.2,
            position: 'right',
            group_position: 'middle'
        },
        {
            type: 'shift_region',
            step: -50000,
            button_html: '<',
            position: 'right',
            group_position: 'middle'
        },
        {
            type: 'shift_region',
            step: -500000,
            button_html: '<<',
            position: 'right',
            group_position: 'start'
        }
    );
    return region_nav_plot_dashboard;
}());

/**
 * Panel Layouts
 * @namespace Layouts.panel
 */

LocusZoom.Layouts.add('panel', 'association', {
    id: 'association',
    width: 800,
    height: 225,
    min_width: 400,
    min_height: 200,
    proportional_width: 1,
    margin: { top: 35, right: 50, bottom: 40, left: 50 },
    inner_border: 'rgb(210, 210, 210)',
    dashboard: (function () {
        var l = LocusZoom.Layouts.get('dashboard', 'standard_panel', { unnamespaced: true });
        l.components.push({
            type: 'toggle_legend',
            position: 'right'
        });
        return l;
    })(),
    axes: {
        x: {
            label: 'Chromosome {{chr}} (Mb)',
            label_offset: 32,
            tick_format: 'region',
            extent: 'state'
        },
        y1: {
            label: '-log10 p-value',
            label_offset: 28
        },
        y2: {
            label: 'Recombination Rate (cM/Mb)',
            label_offset: 40
        }
    },
    legend: {
        orientation: 'vertical',
        origin: { x: 55, y: 40 },
        hidden: true
    },
    interaction: {
        drag_background_to_pan: true,
        drag_x_ticks_to_scale: true,
        drag_y1_ticks_to_scale: true,
        drag_y2_ticks_to_scale: true,
        scroll_to_zoom: true,
        x_linked: true
    },
    data_layers: [
        LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
        LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
        LocusZoom.Layouts.get('data_layer', 'association_pvalues', { unnamespaced: true })
    ]
});

LocusZoom.Layouts.add('panel', 'coaccessibility', {
    id: 'coaccessibility',
    width: 800,
    height: 225,
    min_width: 400,
    min_height: 100,
    proportional_width: 1,
    margin: { top: 35, right: 50, bottom: 40, left: 50 },
    inner_border: 'rgb(210, 210, 210)',
    dashboard: LocusZoom.Layouts.get('dashboard', 'standard_panel', { unnamespaced: true }),
    axes: {
        x: {
            label: 'Chromosome {{chr}} (Mb)',
            label_offset: 32,
            tick_format: 'region',
            extent: 'state'
        },
        y1: {
            label: 'Score',
            label_offset: 28,
            render: false,  // We are mainly concerned with the relative magnitudes: hide y axis to avoid clutter.
        }
    },
    interaction: {
        drag_background_to_pan: true,
        drag_x_ticks_to_scale: true,
        drag_y1_ticks_to_scale: true,
        scroll_to_zoom: true,
        x_linked: true
    },
    data_layers: [
        LocusZoom.Layouts.get('data_layer', 'coaccessibility', { unnamespaced: true })
    ]
});

LocusZoom.Layouts.add('panel', 'association_catalog', function () {
    var l = LocusZoom.Layouts.get('panel', 'association', {
        unnamespaced: true,
        id: 'associationcatalog',
        namespace: { 'assoc': 'assoc', 'ld': 'ld', 'catalog': 'catalog' } // Required to resolve display options
    });
    l.dashboard.components.push({
        type: 'display_options',
        position: 'right',
        color: 'blue',
        // Below: special config specific to this widget
        button_html: 'Display options...',
        button_title: 'Control how plot items are displayed',

        layer_name: 'associationpvaluescatalog',
        default_config_display_name: 'No catalog labels (default)', // display name for the default plot color option (allow user to revert to plot defaults)

        options: [
            {
                // First dropdown menu item
                display_name: 'Label catalog traits',  // Human readable representation of field name
                display: {  // Specify layout directives that control display of the plot for this option
                    label: {
                        text: '{{{{namespace[catalog]}}trait|htmlescape}}',
                        spacing: 6,
                        lines: {
                            style: {
                                'stroke-width': '2px',
                                'stroke': '#333333',
                                'stroke-dasharray': '2px 2px'
                            }
                        },
                        filters: [
                            // Only label points if they are significant for some trait in the catalog, AND in high LD
                            //  with the top hit of interest
                            {
                                field: '{{namespace[catalog]}}trait',
                                operator: '!=',
                                value: null
                            },
                            {
                                field: '{{namespace[catalog]}}log_pvalue',
                                operator: '>',
                                value: LZ_SIG_THRESHOLD_LOGP
                            },
                            {
                                field: '{{namespace[ld]}}state',
                                operator: '>',
                                value: 0.4
                            },
                        ],
                        style: {
                            'font-size': '10px',
                            'font-weight': 'bold',
                            'fill': '#333333'
                        }
                    }
                }
            }
        ]
    });
    l.data_layers = [
        LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
        LocusZoom.Layouts.get('data_layer', 'recomb_rate', { unnamespaced: true }),
        LocusZoom.Layouts.get('data_layer', 'association_pvalues_catalog', { unnamespaced: true })
    ];
    return l;
}());

LocusZoom.Layouts.add('panel', 'genes', {
    id: 'genes',
    width: 800,
    height: 225,
    min_width: 400,
    min_height: 112.5,
    proportional_width: 1,
    margin: { top: 20, right: 50, bottom: 20, left: 50 },
    axes: {},
    interaction: {
        drag_background_to_pan: true,
        scroll_to_zoom: true,
        x_linked: true
    },
    dashboard: (function () {
        var l = LocusZoom.Layouts.get('dashboard', 'standard_panel', { unnamespaced: true });
        l.components.push({
            type: 'resize_to_data',
            position: 'right',
            button_html: 'Show all genes',
        });
        return l;
    })(),
    data_layers: [
        LocusZoom.Layouts.get('data_layer', 'genes', { unnamespaced: true })
    ]
});

LocusZoom.Layouts.add('panel', 'phewas', {
    id: 'phewas',
    width: 800,
    height: 300,
    min_width: 800,
    min_height: 300,
    proportional_width: 1,
    margin: { top: 20, right: 50, bottom: 120, left: 50 },
    inner_border: 'rgb(210, 210, 210)',
    axes: {
        x: {
            ticks: {  // Object based config (shared defaults; allow layers to specify ticks)
                style: {
                    'font-weight': 'bold',
                    'font-size': '11px',
                    'text-anchor': 'start'
                },
                transform: 'rotate(50)',
                position: 'left'  // Special param recognized by `category_scatter` layers
            }
        },
        y1: {
            label: '-log10 p-value',
            label_offset: 28
        }
    },
    data_layers: [
        LocusZoom.Layouts.get('data_layer', 'significance', { unnamespaced: true }),
        LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', { unnamespaced: true })
    ]
});

LocusZoom.Layouts.add('panel', 'annotation_catalog', {
    id: 'annotationcatalog',
    width: 800,
    height: 50,
    min_height: 50,
    proportional_width: 1,
    margin: { top: 25, right: 50, bottom: 0, left: 50 },
    inner_border: 'rgb(210, 210, 210)',
    dashboard: LocusZoom.Layouts.get('dashboard', 'standard_panel', { unnamespaced: true }),
    interaction: {
        drag_background_to_pan: true,
        scroll_to_zoom: true,
        x_linked: true
    },
    data_layers: [
        LocusZoom.Layouts.get('data_layer', 'annotation_catalog', { unnamespaced: true })
    ]
});

/**
 * Plot Layouts
 * @namespace Layouts.plot
 */

LocusZoom.Layouts.add('plot', 'standard_association', {
    state: {},
    width: 800,
    height: 450,
    responsive_resize: 'both',
    min_region_scale: 20000,
    max_region_scale: 1000000,
    dashboard: LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true }),
    panels: [
        LocusZoom.Layouts.get('panel', 'association', { unnamespaced: true, proportional_height: 0.5 }),
        LocusZoom.Layouts.get('panel', 'genes', { unnamespaced: true, proportional_height: 0.5 })
    ]
});

LocusZoom.Layouts.add('plot', 'association_catalog', {
    state: {},
    width: 800,
    height: 500,
    responsive_resize: 'width_only',
    min_region_scale: 20000,
    max_region_scale: 1000000,
    dashboard: LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true }),
    panels: [
        LocusZoom.Layouts.get('panel', 'annotation_catalog', { unnamespaced: true }),
        LocusZoom.Layouts.get('panel', 'association_catalog', { unnamespaced: true }),
        LocusZoom.Layouts.get('panel', 'genes', { unnamespaced: true })
    ]
});

// Shortcut to "StandardLayout" for backward compatibility
LocusZoom.StandardLayout = LocusZoom.Layouts.get('plot', 'standard_association');

LocusZoom.Layouts.add('plot', 'standard_phewas', {
    width: 800,
    height: 600,
    min_width: 800,
    min_height: 600,
    responsive_resize: 'both',
    dashboard: LocusZoom.Layouts.get('dashboard', 'standard_plot', { unnamespaced: true }),
    panels: [
        LocusZoom.Layouts.get('panel', 'phewas', { unnamespaced: true, proportional_height: 0.5 }),
        LocusZoom.Layouts.get('panel', 'genes', {
            unnamespaced: true,
            proportional_height: 0.5,
            margin: { bottom: 40 },
            axes: {
                x: {
                    label: 'Chromosome {{chr}} (Mb)',
                    label_offset: 32,
                    tick_format: 'region',
                    extent: 'state'
                }
            }
        })
    ],
    mouse_guide: false
});

LocusZoom.Layouts.add('plot', 'coaccessibility', {
    state: {},
    width: 800,
    height: 450,
    responsive_resize: 'both',
    min_region_scale: 20000,
    max_region_scale: 1000000,
    dashboard: LocusZoom.Layouts.get('dashboard', 'region_nav_plot', { unnamespaced: true }),
    panels: [
        LocusZoom.Layouts.get('panel', 'coaccessibility', { unnamespaced: true, proportional_height: 0.4 }),
        function () {
            // Take the default genes panel, and add a custom feature to highlight gene tracks based on short name
            // This is a companion to the "match" directive in the coaccessibility panel
            var base = LocusZoom.Layouts.get('panel', 'genes', { unnamespaced: true, proportional_height: 0.6 });
            var layer = base.data_layers[0];
            layer.match = { send: 'gene_name', receive: 'gene_name' };
            var color_config = [
                {
                    field: 'lz_highlight_match', // Special field name whose presence triggers custom rendering
                    scale_function: 'if',
                    parameters: {
                        field_value: true,
                        then: '#ff0000',
                    },
                },
                {
                    field: 'lz_highlight_match', // Special field name whose presence triggers custom rendering
                    scale_function: 'if',
                    parameters: {
                        field_value: false,
                        then: '#EAE6E6',
                    },
                },
                '#363696',
            ];
            layer.color = color_config;
            layer.stroke = color_config;
            return base;
        }(),
    ]
});
