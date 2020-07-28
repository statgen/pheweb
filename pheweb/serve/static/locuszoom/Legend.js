/* global LocusZoom */
'use strict';

/**
 * An SVG object used to display contextual information about a panel.
 * Panel layouts determine basic features of a legend - its position in the panel, orientation, title, etc.
 * Layouts of child data layers of the panel determine the actual content of the legend.
 *
 * @class
 * @param {LocusZoom.Panel} parent
*/
LocusZoom.Legend = function(parent) {
    if (!(parent instanceof LocusZoom.Panel)) {
        throw new Error('Unable to create legend, parent must be a locuszoom panel');
    }
    /** @member {LocusZoom.Panel} */
    this.parent = parent;
    /** @member {String} */
    this.id = this.parent.getBaseId() + '.legend';

    this.parent.layout.legend = LocusZoom.Layouts.merge(this.parent.layout.legend || {}, LocusZoom.Legend.DefaultLayout);
    /** @member {Object} */
    this.layout = this.parent.layout.legend;

    /** @member {d3.selection} */
    this.selector = null;
    /** @member {d3.selection} */
    this.background_rect = null;
    /** @member {d3.selection[]} */
    this.elements = [];
    /**
     * SVG selector for the group containing all elements in the legend
     * @protected
     * @member {d3.selection|null}
     */
    this.elements_group = null;

    /**
     * TODO: Not sure if this property is used; the external-facing methods are setting `layout.hidden` instead. Tentatively mark deprecated.
     * @deprecated
     * @protected
     * @member {Boolean}
     */
    this.hidden = false;

    return this.render();
};

/**
 * The default layout used by legends (used internally)
 * @protected
 * @member {Object}
 */
LocusZoom.Legend.DefaultLayout = {
    orientation: 'vertical',
    origin: { x: 0, y: 0 },
    width: 10,
    height: 10,
    padding: 5,
    label_size: 12,
    hidden: false
};

/**
 * Render the legend in the parent panel
 */
LocusZoom.Legend.prototype.render = function() {

    // Get a legend group selector if not yet defined
    if (!this.selector) {
        this.selector = this.parent.svg.group.append('g')
            .attr('id', this.parent.getBaseId() + '.legend').attr('class', 'lz-legend');
    }

    // Get a legend background rect selector if not yet defined
    if (!this.background_rect) {
        this.background_rect = this.selector.append('rect')
            .attr('width', 100).attr('height', 100).attr('class', 'lz-legend-background');
    }

    // Get a legend elements group selector if not yet defined
    if (!this.elements_group) {
        this.elements_group = this.selector.append('g');
    }

    // Remove all elements from the document and re-render from scratch
    this.elements.forEach(function(element) {
        element.remove();
    });
    this.elements = [];

    // Gather all elements from data layers in order (top to bottom) and render them
    var padding = +this.layout.padding || 1;
    var x = padding;
    var y = padding;
    var line_height = 0;
    this.parent.data_layer_ids_by_z_index.slice().reverse().forEach(function(id) {
        if (Array.isArray(this.parent.data_layers[id].layout.legend)) {
            this.parent.data_layers[id].layout.legend.forEach(function(element) {
                var selector = this.elements_group.append('g')
                    .attr('transform', 'translate(' + x + ',' + y + ')');
                var label_size = +element.label_size || +this.layout.label_size || 12;
                var label_x = 0;
                var label_y = (label_size / 2) + (padding / 2);
                line_height = Math.max(line_height, label_size + padding);
                // Draw the legend element symbol (line, rect, shape, etc)
                if (element.shape === 'line') {
                    // Line symbol
                    var length = +element.length || 16;
                    var path_y = (label_size / 4) + (padding / 2);
                    selector.append('path').attr('class', element.class || '')
                        .attr('d', 'M0,' + path_y + 'L' + length + ',' + path_y)
                        .style(element.style || {});
                    label_x = length + padding;
                } else if (element.shape === 'rect') {
                    // Rect symbol
                    var width = +element.width || 16;
                    var height = +element.height || width;
                    selector.append('rect').attr('class', element.class || '')
                        .attr('width', width).attr('height', height)
                        .attr('fill', element.color || {})
                        .style(element.style || {});
                    label_x = width + padding;
                    line_height = Math.max(line_height, height + padding);
                } else if (d3.svg.symbolTypes.indexOf(element.shape) !== -1) {
                    // Shape symbol (circle, diamond, etc.)
                    var size = +element.size || 40;
                    var radius = Math.ceil(Math.sqrt(size / Math.PI));
                    selector.append('path').attr('class', element.class || '')
                        .attr('d', d3.svg.symbol().size(size).type(element.shape))
                        .attr('transform', 'translate(' + radius + ',' + (radius + (padding / 2)) + ')')
                        .attr('fill', element.color || {})
                        .style(element.style || {});
                    label_x = (2 * radius) + padding;
                    label_y = Math.max((2 * radius) + (padding / 2), label_y);
                    line_height = Math.max(line_height, (2 * radius) + padding);
                }
                // Draw the legend element label
                selector.append('text').attr('text-anchor', 'left').attr('class', 'lz-label')
                    .attr('x', label_x).attr('y', label_y).style({'font-size': label_size}).text(element.label);
                // Position the legend element group based on legend layout orientation
                var bcr = selector.node().getBoundingClientRect();
                if (this.layout.orientation === 'vertical') {
                    y += bcr.height + padding;
                    line_height = 0;
                } else {
                    // Ensure this element does not exceed the panel width
                    // (E.g. drop to the next line if it does, but only if it's not the only element on this line)
                    var right_x = this.layout.origin.x + x + bcr.width;
                    if (x > padding && right_x > this.parent.layout.width) {
                        y += line_height;
                        x = padding;
                        selector.attr('transform', 'translate(' + x + ',' + y + ')');
                    }
                    x += bcr.width + (3 * padding);
                }
                // Store the element
                this.elements.push(selector);
            }.bind(this));
        }
    }.bind(this));

    // Scale the background rect to the elements in the legend
    var bcr = this.elements_group.node().getBoundingClientRect();
    this.layout.width = bcr.width + (2 * this.layout.padding);
    this.layout.height = bcr.height + (2 * this.layout.padding);
    this.background_rect
        .attr('width', this.layout.width)
        .attr('height', this.layout.height);

    // Set the visibility on the legend from the "hidden" flag
    // TODO: `show()` and `hide()` call a full rerender; might be able to make this more lightweight?
    this.selector.style({ visibility: this.layout.hidden ? 'hidden' : 'visible' });

    // TODO: Annotate return type and make consistent
    return this.position();
};

/**
 * Place the legend in position relative to the panel, as specified in the layout configuration
 * @returns {LocusZoom.Legend | null}
 * TODO: should this always be chainable?
 */
LocusZoom.Legend.prototype.position = function() {
    if (!this.selector) { return this; }
    var bcr = this.selector.node().getBoundingClientRect();
    if (!isNaN(+this.layout.pad_from_bottom)) {
        this.layout.origin.y = this.parent.layout.height - bcr.height - +this.layout.pad_from_bottom;
    }
    if (!isNaN(+this.layout.pad_from_right)) {
        this.layout.origin.x = this.parent.layout.width - bcr.width - +this.layout.pad_from_right;
    }
    this.selector.attr('transform', 'translate(' + this.layout.origin.x + ',' + this.layout.origin.y + ')');
};

/**
 * Hide the legend (triggers a re-render)
 * @public
 */
LocusZoom.Legend.prototype.hide = function() {
    this.layout.hidden = true;
    this.render();
};

/**
 * Show the legend (triggers a re-render)
 * @public
 */
LocusZoom.Legend.prototype.show = function() {
    this.layout.hidden = false;
    this.render();
};
