'use strict';

/*********************
 * Genes Data Layer
 * Implements a data layer that will render gene tracks
 * @class
 * @augments LocusZoom.DataLayer
*/
LocusZoom.DataLayers.add('genes', function(layout) {
    /**
     * Define a default layout for this DataLayer type and merge it with the passed argument
     * @protected
     * @member {Object}
     * */
    this.DefaultLayout = {
        // Optionally specify different fill and stroke properties
        stroke: 'rgb(54, 54, 150)',
        color: '#363696',
        label_font_size: 12,
        label_exon_spacing: 4,
        exon_height: 16,
        bounding_box_padding: 6,
        track_vertical_spacing: 10,
        tooltip_positioning: 'top',
    };
    layout = LocusZoom.Layouts.merge(layout, this.DefaultLayout);

    // Apply the arguments to set LocusZoom.DataLayer as the prototype
    LocusZoom.DataLayer.apply(this, arguments);

    /**
     * Generate a statusnode ID for a given element
     * @override
     * @returns {String}
     */
    this.getElementStatusNodeId = function(element) {
        return this.getElementId(element) + '-statusnode';
    };

    /**
     * Helper function to sum layout values to derive total height for a single gene track
     * @returns {number}
     */
    this.getTrackHeight = function() {
        return 2 * this.layout.bounding_box_padding
            + this.layout.label_font_size
            + this.layout.label_exon_spacing
            + this.layout.exon_height
            + this.layout.track_vertical_spacing;
    };

    /**
     * A gene may have arbitrarily many transcripts, but this data layer isn't set up to render them yet.
     * Stash a transcript_idx to point to the first transcript and use that for all transcript refs.
     * @member {number}
     * @type {number}
     */
    this.transcript_idx = 0;

    /**
     * An internal counter for the number of tracks in the data layer. Used as an internal counter for looping
     *   over positions / assignments
     * @protected
     * @member {number}
     */
    this.tracks = 1;

    /**
     * Store information about genes in dataset, in a hash indexed by track number: {track_number: [gene_indices]}
     * @member {Object.<Number, Array>}
     */
    this.gene_track_index = { 1: [] };

    /**
     * Ensure that genes in overlapping chromosome regions are positioned so that parts of different genes do not
     *   overlap in the view. A track is a row used to vertically separate overlapping genes.
     * @returns {LocusZoom.DataLayer}
     */
    this.assignTracks = function() {
        /**
         * Function to get the width in pixels of a label given the text and layout attributes
         *      TODO: Move to outer scope?
         * @param {String} gene_name
         * @param {number|string} font_size
         * @returns {number}
         */
        this.getLabelWidth = function(gene_name, font_size) {
            try {
                var temp_text = this.svg.group.append('text')
                    .attr('x', 0).attr('y', 0).attr('class', 'lz-data_layer-genes lz-label')
                    .style('font-size', font_size)
                    .text(gene_name + '→');
                var label_width = temp_text.node().getBBox().width;
                temp_text.remove();
                return label_width;
            } catch (e) {
                return 0;
            }
        };

        // Reinitialize some metadata
        this.tracks = 1;
        this.gene_track_index = { 1: [] };

        this.data.map(function(d, g) {

            // If necessary, split combined gene id / version fields into discrete fields.
            // NOTE: this may be an issue with CSG's genes data source that may eventually be solved upstream.
            if (this.data[g].gene_id && this.data[g].gene_id.indexOf('.')) {
                var split = this.data[g].gene_id.split('.');
                this.data[g].gene_id = split[0];
                this.data[g].gene_version = split[1];
            }

            // Stash the transcript ID on the parent gene
            this.data[g].transcript_id = this.data[g].transcripts[this.transcript_idx].transcript_id;

            // Determine display range start and end, based on minimum allowable gene display width, bounded by what we can see
            // (range: values in terms of pixels on the screen)
            this.data[g].display_range = {
                start: this.parent.x_scale(Math.max(d.start, this.state.start)),
                end:   this.parent.x_scale(Math.min(d.end, this.state.end))
            };
            this.data[g].display_range.label_width = this.getLabelWidth(this.data[g].gene_name, this.layout.label_font_size);
            this.data[g].display_range.width = this.data[g].display_range.end - this.data[g].display_range.start;
            // Determine label text anchor (default to middle)
            this.data[g].display_range.text_anchor = 'middle';
            if (this.data[g].display_range.width < this.data[g].display_range.label_width) {
                if (d.start < this.state.start) {
                    this.data[g].display_range.end = this.data[g].display_range.start
                        + this.data[g].display_range.label_width
                        + this.layout.label_font_size;
                    this.data[g].display_range.text_anchor = 'start';
                } else if (d.end > this.state.end) {
                    this.data[g].display_range.start = this.data[g].display_range.end
                        - this.data[g].display_range.label_width
                        - this.layout.label_font_size;
                    this.data[g].display_range.text_anchor = 'end';
                } else {
                    var centered_margin = ((this.data[g].display_range.label_width - this.data[g].display_range.width) / 2)
                        + this.layout.label_font_size;
                    if ((this.data[g].display_range.start - centered_margin) < this.parent.x_scale(this.state.start)) {
                        this.data[g].display_range.start = this.parent.x_scale(this.state.start);
                        this.data[g].display_range.end = this.data[g].display_range.start + this.data[g].display_range.label_width;
                        this.data[g].display_range.text_anchor = 'start';
                    } else if ((this.data[g].display_range.end + centered_margin) > this.parent.x_scale(this.state.end)) {
                        this.data[g].display_range.end = this.parent.x_scale(this.state.end);
                        this.data[g].display_range.start = this.data[g].display_range.end - this.data[g].display_range.label_width;
                        this.data[g].display_range.text_anchor = 'end';
                    } else {
                        this.data[g].display_range.start -= centered_margin;
                        this.data[g].display_range.end += centered_margin;
                    }
                }
                this.data[g].display_range.width = this.data[g].display_range.end - this.data[g].display_range.start;
            }
            // Add bounding box padding to the calculated display range start, end, and width
            this.data[g].display_range.start -= this.layout.bounding_box_padding;
            this.data[g].display_range.end   += this.layout.bounding_box_padding;
            this.data[g].display_range.width += 2 * this.layout.bounding_box_padding;
            // Convert and stash display range values into domain values
            // (domain: values in terms of the data set, e.g. megabases)
            this.data[g].display_domain = {
                start: this.parent.x_scale.invert(this.data[g].display_range.start),
                end:   this.parent.x_scale.invert(this.data[g].display_range.end)
            };
            this.data[g].display_domain.width = this.data[g].display_domain.end - this.data[g].display_domain.start;

            // Using display range/domain data generated above cast each gene to tracks such that none overlap
            this.data[g].track = null;
            var potential_track = 1;
            while (this.data[g].track === null) {
                var collision_on_potential_track = false;
                this.gene_track_index[potential_track].map(function(placed_gene) {
                    if (!collision_on_potential_track) {
                        var min_start = Math.min(placed_gene.display_range.start, this.display_range.start);
                        var max_end = Math.max(placed_gene.display_range.end, this.display_range.end);
                        if ((max_end - min_start) < (placed_gene.display_range.width + this.display_range.width)) {
                            collision_on_potential_track = true;
                        }
                    }
                }.bind(this.data[g]));
                if (!collision_on_potential_track) {
                    this.data[g].track = potential_track;
                    this.gene_track_index[potential_track].push(this.data[g]);
                } else {
                    potential_track++;
                    if (potential_track > this.tracks) {
                        this.tracks = potential_track;
                        this.gene_track_index[potential_track] = [];
                    }
                }
            }

            // Stash parent references on all genes, trascripts, and exons
            this.data[g].parent = this;
            this.data[g].transcripts.map(function(d, t) {
                this.data[g].transcripts[t].parent = this.data[g];
                this.data[g].transcripts[t].exons.map(function(d, e) {
                    this.data[g].transcripts[t].exons[e].parent = this.data[g].transcripts[t];
                }.bind(this));
            }.bind(this));

        }.bind(this));
        return this;
    };

    /**
     * Main render function
     */
    this.render = function() {

        var self = this;
        this.assignTracks();

        var width, height, x, y;

        // Render gene groups
        var selection = this.svg.group.selectAll('g.lz-data_layer-genes')
            .data(this.data, function(d) { return d.gene_name; });

        selection.enter().append('g')
            .attr('class', 'lz-data_layer-genes');

        selection.attr('id', function(d) { return this.getElementId(d); }.bind(this))
            .each(function(gene) {

                var data_layer = gene.parent;

                // Render gene bounding boxes (status nodes to show selected/highlighted)
                var bboxes = d3.select(this).selectAll('rect.lz-data_layer-genes.lz-data_layer-genes-statusnode')
                    .data([gene], function(d) { return data_layer.getElementStatusNodeId(d); });

                bboxes.enter().append('rect')
                    .attr('class', 'lz-data_layer-genes lz-data_layer-genes-statusnode');

                bboxes
                    .attr('id', function(d) {
                        return data_layer.getElementStatusNodeId(d);
                    })
                    .attr('rx', function() {
                        return data_layer.layout.bounding_box_padding;
                    })
                    .attr('ry', function() {
                        return data_layer.layout.bounding_box_padding;
                    });

                width = function(d) {
                    return d.display_range.width;
                };
                height = function() {
                    return data_layer.getTrackHeight() - data_layer.layout.track_vertical_spacing;
                };
                x = function(d) {
                    return d.display_range.start;
                };
                y = function(d) {
                    return ((d.track - 1) * data_layer.getTrackHeight());
                };
                bboxes
                    .attr('width', width).attr('height', height).attr('x', x).attr('y', y);

                bboxes.exit().remove();

                // Render gene boundaries
                var boundary_fill = function(d, i) { return self.resolveScalableParameter(self.layout.color, d, i); };
                var boundary_stroke = function(d, i) { return self.resolveScalableParameter(self.layout.stroke, d, i); };
                var boundaries = d3.select(this).selectAll('rect.lz-data_layer-genes.lz-boundary')
                    .data([gene], function(d) { return d.gene_name + '_boundary'; })
                    .style({ fill: boundary_fill, stroke: boundary_stroke });

                boundaries.enter().append('rect')
                    .attr('class', 'lz-data_layer-genes lz-boundary');

                width = function(d) {
                    return data_layer.parent.x_scale(d.end) - data_layer.parent.x_scale(d.start);
                };
                height = function() {
                    return 1; // TODO: scale dynamically?
                };
                x = function(d) {
                    return data_layer.parent.x_scale(d.start);
                };
                y = function(d) {
                    return ((d.track - 1) * data_layer.getTrackHeight())
                        + data_layer.layout.bounding_box_padding
                        + data_layer.layout.label_font_size
                        + data_layer.layout.label_exon_spacing
                        + (Math.max(data_layer.layout.exon_height, 3) / 2);
                };
                boundaries
                    .attr('width', width).attr('height', height).attr('x', x).attr('y', y);

                boundaries.exit().remove();

                // Render gene labels
                var labels = d3.select(this).selectAll('text.lz-data_layer-genes.lz-label')
                    .data([gene], function(d) { return d.gene_name + '_label'; });

                labels.enter().append('text')
                    .attr('class', 'lz-data_layer-genes lz-label');

                labels
                    .attr('text-anchor', function(d) {
                        return d.display_range.text_anchor;
                    })
                    .text(function(d) {
                        return (d.strand === '+') ? d.gene_name + '→' : '←' + d.gene_name;
                    })
                    .style('font-size', gene.parent.layout.label_font_size);

                x = function(d) {
                    if (d.display_range.text_anchor === 'middle') {
                        return d.display_range.start + (d.display_range.width / 2);
                    } else if (d.display_range.text_anchor === 'start') {
                        return d.display_range.start + data_layer.layout.bounding_box_padding;
                    } else if (d.display_range.text_anchor === 'end') {
                        return d.display_range.end - data_layer.layout.bounding_box_padding;
                    }
                };
                y = function(d) {
                    return ((d.track - 1) * data_layer.getTrackHeight())
                        + data_layer.layout.bounding_box_padding
                        + data_layer.layout.label_font_size;
                };
                labels
                    .attr('x', x).attr('y', y);

                labels.exit().remove();

                // Render exon rects (first transcript only, for now)
                // Exons: by default color on gene properties for consistency with the gene boundary track- hence color uses d.parent.parent
                var exon_fill = function(d, i) { return self.resolveScalableParameter(self.layout.color, d.parent.parent, i); };
                var exon_stroke = function(d, i) { return self.resolveScalableParameter(self.layout.stroke, d.parent.parent, i); };

                var exons = d3.select(this).selectAll('rect.lz-data_layer-genes.lz-exon')
                    .data(gene.transcripts[gene.parent.transcript_idx].exons, function(d) { return d.exon_id; });

                exons.enter().append('rect')
                    .attr('class', 'lz-data_layer-genes lz-exon');

                exons
                    .style({ fill: exon_fill, stroke: exon_stroke });

                width = function(d) {
                    return data_layer.parent.x_scale(d.end) - data_layer.parent.x_scale(d.start);
                };
                height = function() {
                    return data_layer.layout.exon_height;
                };
                x = function(d) {
                    return data_layer.parent.x_scale(d.start);
                };
                y = function() {
                    return ((gene.track - 1) * data_layer.getTrackHeight())
                        + data_layer.layout.bounding_box_padding
                        + data_layer.layout.label_font_size
                        + data_layer.layout.label_exon_spacing;
                };

                exons
                    .attr('width', width).attr('height', height).attr('x', x).attr('y', y);

                exons.exit().remove();

                // Render gene click area
                var clickareas = d3.select(this).selectAll('rect.lz-data_layer-genes.lz-clickarea')
                    .data([gene], function(d) { return d.gene_name + '_clickarea'; });

                clickareas.enter().append('rect')
                    .attr('class', 'lz-data_layer-genes lz-clickarea');

                clickareas
                    .attr('id', function(d) {
                        return data_layer.getElementId(d) + '_clickarea';
                    })
                    .attr('rx', function() {
                        return data_layer.layout.bounding_box_padding;
                    })
                    .attr('ry', function() {
                        return data_layer.layout.bounding_box_padding;
                    });

                width = function(d) {
                    return d.display_range.width;
                };
                height = function() {
                    return data_layer.getTrackHeight() - data_layer.layout.track_vertical_spacing;
                };
                x = function(d) {
                    return d.display_range.start;
                };
                y = function(d) {
                    return ((d.track - 1) * data_layer.getTrackHeight());
                };
                clickareas
                    .attr('width', width).attr('height', height).attr('x', x).attr('y', y);

                // Remove old clickareas as needed
                clickareas.exit().remove();

                // Apply default event emitters to clickareas
                clickareas.on('click.event_emitter', function(element) {
                    element.parent.parent.emit('element_clicked', element, true);
                });

                // Apply mouse behaviors to clickareas
                data_layer.applyBehaviors(clickareas);

            });

        // Remove old elements as needed
        selection.exit().remove();

    };

    this._getTooltipPosition = function(tooltip) {

        var gene_bbox_id = this.getElementStatusNodeId(tooltip.data);
        var gene_bbox = d3.select('#' + gene_bbox_id).node().getBBox();
        return {
            x_min: this.parent.x_scale(tooltip.data.start),
            x_max: this.parent.x_scale(tooltip.data.end),
            y_min: gene_bbox.y,
            y_max: gene_bbox.y + gene_bbox.height,
        };
    };
    return this;

});
