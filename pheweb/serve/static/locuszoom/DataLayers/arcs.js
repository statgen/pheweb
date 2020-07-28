'use strict';
/**
 * Loop Data Layer
 * Implements a data layer that will render chromatin accessibility tracks.
 * This layer draws arcs (one per datapoint) that connect two endpoints (x.field1 and x.field2) by means of an arc,
 *  with a height determined by y.field.
 *
 * @class LocusZoom.DataLayers.arcs
 * @augments LocusZoom.DataLayer
 */
LocusZoom.DataLayers.add('arcs', function(layout) {
    // Define a default layout for this DataLayer type and merge it with the passed argument
    this.DefaultLayout = {
        color: 'seagreen',
        hitarea_width: '10px',
        style: {
            fill: 'none',
            'stroke-width': '1px',
            'stroke-opacity': '100%',
        },
        tooltip_positioning: 'top',
    };
    layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);
    // Apply the arguments to set LocusZoom.DataLayer as the prototype
    LocusZoom.DataLayer.apply(this, arguments);

    // Implement the main render function
    this.render = function() {
        var self = this;
        var layout = self.layout;
        var x_scale = self.parent['x_scale'];
        var y_scale = self.parent['y' + layout.y_axis.axis + '_scale'];

        // Optionally restrict the data to a specific set of filters
        var filters = layout.filters || [];
        var trackData = this.filter(filters, 'elements');

        // Helper: Each individual data point describes a path composed of 3 points, with a spline to smooth the line
        function _make_line(d) {
            var x1 = d[layout.x_axis.field1];
            var x2 = d[layout.x_axis.field2];
            var xmid = (x1 + x2) / 2;
            var coords = [
                [x_scale(x1), y_scale(0)],
                [x_scale(xmid), y_scale(d[layout.y_axis.field])],
                [x_scale(x2), y_scale(0)]
            ];
            // Smoothing options: https://bl.ocks.org/emmasaunders/f7178ed715a601c5b2c458a2c7093f78
            var line = d3.svg.line()
                .interpolate('monotone')
                .x(function (d) {return d[0];})
                .y(function (d) {return d[1];});
            return line(coords);
        }

        // Draw real lines, and also invisible hitareas for easier mouse events
        var selection = this.svg.group
            .selectAll('path.lz-data_layer-arcs')
            .data(trackData, function(d) {
                return self.getElementId(d);
            });

        var hitareas = this.svg.group
            .selectAll('path.lz-data_layer-arcs-hitarea')
            .data(trackData, function(d) {
                return self.getElementId(d);
            });
        // Add new points as necessary
        selection
            .enter()
            .append('path')
            .attr('class', 'lz-data_layer-arcs')
            .attr('id', function(d) { return self.getElementId(d); });

        hitareas
            .enter()
            .append('path')
            .attr('class', 'lz-data_layer-arcs-hitarea')
            .attr('id', function(d) { return self.getElementId(d); });

        // Update selection/set coordinates
        selection
            .style(layout.style)
            .attr('stroke', function(d, i) {
                return self.resolveScalableParameter(self.layout.color, d, i);
            })
            .attr('d', function (d, i) {
                return _make_line(d);
            });

        hitareas
            .style({
                fill: 'none',
                'stroke-width': layout.hitarea_width,
                'stroke-opacity': 0,
                stroke: 'transparent',
            })
            .attr('d', function (d, i) {
                return _make_line(d);
            });

        // Remove old elements as needed
        selection.exit().remove();
        hitareas.exit().remove();

        // Apply mouse behaviors to hitareas
        this.applyBehaviors(hitareas);
        return this;
    };

    this._getTooltipPosition = function (tooltip) {
        // Center the tooltip arrow at the apex of the arc. Sometimes, only part of an arc shows on the screen, so we
        //  clean up these values to ensure that the tooltip will appear within the window.
        var panel = this.parent;
        var layout = this.layout;

        var x1 = tooltip.data[layout.x_axis.field1];
        var x2 = tooltip.data[layout.x_axis.field2];

        var y_scale = panel['y' + layout.y_axis.axis + '_scale'];

        return {
            x_min: panel.x_scale(Math.min(x1, x2)),
            x_max: panel.x_scale(Math.max(x1, x2)),
            y_min: y_scale(tooltip.data[layout.y_axis.field]),
            y_max: y_scale(0),
        };
    };

    // End constructor
    return this;
});
