'use strict';

/*********************
 * Line Data Layer
 * Implements a standard line plot, representing either a trace or a filled curve.
 * @class
 * @augments LocusZoom.DataLayer
*/
LocusZoom.DataLayers.add('line', function(layout) {

    // Define a default layout for this DataLayer type and merge it with the passed argument
    /** @member {Object} */
    this.DefaultLayout = {
        style: {
            fill: 'none',
            'stroke-width': '2px'
        },
        interpolate: 'linear',
        x_axis: { field: 'x' },
        y_axis: { field: 'y', axis: 1 },
        hitarea_width: 5,
    };

    layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);

    if (layout.tooltip) {
        throw new Error('The line / filled curve layer does not support tooltips');
    }

    // Apply the arguments to set LocusZoom.DataLayer as the prototype
    LocusZoom.DataLayer.apply(this, arguments);

    /**
     * Implement the main render function
     */
    this.render = function() {
        // Several vars needed to be in scope
        var panel = this.parent;
        var x_field = this.layout.x_axis.field;
        var y_field = this.layout.y_axis.field;
        var x_scale = 'x_scale';
        var y_scale = 'y' + this.layout.y_axis.axis + '_scale';

        // Join data to the line selection
        var selection = this.svg.group
            .selectAll('path.lz-data_layer-line')
            .data([this.data]);

        // Create path element, apply class
        this.path = selection.enter()
            .append('path')
            .attr('class', 'lz-data_layer-line');

        // Generate the line
        var line;
        if (this.layout.style.fill && this.layout.style.fill !== 'none') {
            // Filled curve: define the line as a filled boundary
            line = d3.svg.area()
                .x(function(d) { return parseFloat(panel[x_scale](d[x_field])); })
                .y0(function(d) {return parseFloat(panel[y_scale](0));})
                .y1(function(d) { return parseFloat(panel[y_scale](d[y_field])); });
        } else {
            // Basic line
            line = d3.svg.line()
                .x(function(d) { return parseFloat(panel[x_scale](d[x_field])); })
                .y(function(d) { return parseFloat(panel[y_scale](d[y_field])); })
                .interpolate(this.layout.interpolate);
        }

        // Apply line and style
        selection
            .attr('d', line)
            .style(this.layout.style);

        // Remove old elements as needed
        selection.exit().remove();

    };

    /**
     * Redefine setElementStatus family of methods as line data layers will only ever have a single path element
     * @param {String} status A member of `LocusZoom.DataLayer.Statuses.adjectives`
     * @param {String|Object} element
     * @param {Boolean} toggle
     * @returns {LocusZoom.DataLayer}
     */
    this.setElementStatus = function(status, element, toggle) {
        return this.setAllElementStatus(status, toggle);
    };
    this.setElementStatusByFilters = function(status, toggle) {
        return this.setAllElementStatus(status, toggle);
    };
    this.setAllElementStatus = function(status, toggle) {
        // Sanity check
        if (typeof status == 'undefined' || LocusZoom.DataLayer.Statuses.adjectives.indexOf(status) === -1) {
            throw new Error('Invalid status passed to DataLayer.setAllElementStatus()');
        }
        if (typeof this.layer_state.status_flags[status] == 'undefined') { return this; }
        if (typeof toggle == 'undefined') { toggle = true; }

        // Update global status flag
        this.global_statuses[status] = toggle;

        // Apply class to path based on global status flags
        var path_class = 'lz-data_layer-line';
        Object.keys(this.global_statuses).forEach(function(global_status) {
            if (this.global_statuses[global_status]) { path_class += ' lz-data_layer-line-' + global_status; }
        }.bind(this));
        this.path.attr('class', path_class);

        // Trigger layout changed event hook
        this.parent.emit('layout_changed', true);
        return this;
    };

    return this;

});


/***************************
 *  Orthogonal Line Data Layer
 *  Implements a horizontal or vertical line given an orientation and an offset in the layout
 *  Does not require a data source
 * @class
 * @augments LocusZoom.DataLayer
*/
LocusZoom.DataLayers.add('orthogonal_line', function(layout) {

    // Define a default layout for this DataLayer type and merge it with the passed argument
    this.DefaultLayout = {
        style: {
            'stroke': '#D3D3D3',
            'stroke-width': '3px',
            'stroke-dasharray': '10px 10px'
        },
        orientation: 'horizontal',
        x_axis: {
            axis: 1,
            decoupled: true
        },
        y_axis: {
            axis: 1,
            decoupled: true
        },
        tooltip_positioning: 'vertical',
        offset: 0
    };
    layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);

    // Require that orientation be "horizontal" or "vertical" only
    if (['horizontal','vertical'].indexOf(layout.orientation) === -1) {
        layout.orientation = 'horizontal';
    }

    // Vars for storing the data generated line
    /** @member {Array} */
    this.data = [];

    // Apply the arguments to set LocusZoom.DataLayer as the prototype
    LocusZoom.DataLayer.apply(this, arguments);

    this.getElementId = function (element) {
        // There is only one line per datalayer, so this is sufficient.
        return this.getBaseId();
    };

    /**
     * Implement the main render function
     */
    this.render = function() {

        // Several vars needed to be in scope
        var panel = this.parent;
        var x_scale = 'x_scale';
        var y_scale = 'y' + this.layout.y_axis.axis + '_scale';
        var x_extent = 'x_extent';
        var y_extent = 'y' + this.layout.y_axis.axis + '_extent';
        var x_range = 'x_range';

        // Generate data using extents depending on orientation
        if (this.layout.orientation === 'horizontal') {
            this.data = [
                { x: panel[x_extent][0], y: this.layout.offset },
                { x: panel[x_extent][1], y: this.layout.offset }
            ];
        } else if (this.layout.orientation === 'vertical') {
            this.data = [
                { x: this.layout.offset, y: panel[y_extent][0] },
                { x: this.layout.offset, y: panel[y_extent][1] }
            ];
        } else {
            throw new Error('Unrecognized vertical line type. Must be "vertical" or "horizontal"');
        }

        // Join data to the line selection
        var selection = this.svg.group
            .selectAll('path.lz-data_layer-line')
            .data([this.data]);

        // Create path element, apply class
        this.path = selection.enter()
            .append('path')
            .attr('class', 'lz-data_layer-line');

        // In some cases, a vertical line may overlay a track that has no inherent y-values (extent)
        //  When that happens, provide a default height based on the current panel dimensions (accounting
        //      for any resizing that happened after the panel was created)
        var default_y = [panel.layout.cliparea.height, 0];

        // Generate the line
        var line = d3.svg.line()
            .x(function(d, i) {
                var x = parseFloat(panel[x_scale](d['x']));
                return isNaN(x) ? panel[x_range][i] : x;
            })
            .y(function(d, i) {
                var y = parseFloat(panel[y_scale](d['y']));
                return isNaN(y) ? default_y[i] : y;
            })
            .interpolate('linear');

        // Apply line and style
        selection
            .attr('d', line)
            .style(this.layout.style);

        // Remove old elements as needed
        selection.exit().remove();

        // Allow the layer to respond to mouseover events and show a tooltip.
        this.applyBehaviors(selection);
    };

    this._getTooltipPosition = function (tooltip) {
        try {
            var coords = d3.mouse(this.svg.container.node());
            var x = coords[0];
            var y = coords[1];
            return { x_min: x - 1, x_max: x + 1, y_min: y - 1, y_max: y + 1 };
        } catch (e) {
            // On redraw, there won't be a mouse event, so skip tooltip repositioning.
            return null;
        }
    };

    return this;

});
