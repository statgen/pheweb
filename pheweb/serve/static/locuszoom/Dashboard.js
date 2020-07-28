/* global LocusZoom */
'use strict';

/**
 * A Dashboard is an HTML element used for presenting arbitrary user interface components. Dashboards are anchored
 *   to either the entire Plot or to individual Panels.
 *
 * Each dashboard is an HTML-based (read: not SVG) collection of components used to display information or provide
 *   user interface. Dashboards can exist on entire plots, where their visibility is permanent and vertically adjacent
 *   to the plot, or on individual panels, where their visibility is tied to a behavior (e.g. a mouseover) and is as
 *   an overlay.
 * @class
 */
LocusZoom.Dashboard = function(parent) {
    // parent must be a locuszoom plot or panel
    if (!(parent instanceof LocusZoom.Plot) && !(parent instanceof LocusZoom.Panel)) {
        throw new Error('Unable to create dashboard, parent must be a locuszoom plot or panel');
    }
    /** @member {LocusZoom.Plot|LocusZoom.Panel} */
    this.parent = parent;
    /** @member {String} */
    this.id = this.parent.getBaseId() + '.dashboard';
    /** @member {('plot'|'panel')} */
    this.type = (this.parent instanceof LocusZoom.Plot) ? 'plot' : 'panel';
    /** @member {LocusZoom.Plot} */
    this.parent_plot = this.type === 'plot' ? this.parent : this.parent.parent;

    /** @member {d3.selection} */
    this.selector = null;
    /** @member {LocusZoom.Dashboard.Component[]} */
    this.components = [];
    /**
     * The timer identifier as returned by setTimeout
     * @member {Number}
     */
    this.hide_timeout = null;
    /**
     * Whether to hide the dashboard. Can be overridden by a child component. Check via `shouldPersist`
     * @protected
     * @member {Boolean}
     */
    this.persist = false;

    // TODO: Return value from constructor function?
    return this.initialize();
};

/**
 * Prepare the dashboard for first use: generate all component instances for this dashboard, based on the provided
 *   layout of the parent. Connects event listeners and shows/hides as appropriate.
 * @returns {LocusZoom.Dashboard}
 */
LocusZoom.Dashboard.prototype.initialize = function() {
    // Parse layout to generate component instances
    if (Array.isArray(this.parent.layout.dashboard.components)) {
        this.parent.layout.dashboard.components.forEach(function(layout) {
            try {
                var component = LocusZoom.Dashboard.Components.get(layout.type, layout, this);
                this.components.push(component);
            } catch (e) {
                console.warn(e);
            }
        }.bind(this));
    }

    // Add mouseover event handlers to show/hide panel dashboard
    if (this.type === 'panel') {
        d3.select(this.parent.parent.svg.node().parentNode).on('mouseover.' + this.id, function() {
            clearTimeout(this.hide_timeout);
            if (!this.selector || this.selector.style('visibility') === 'hidden') { this.show(); }
        }.bind(this));
        d3.select(this.parent.parent.svg.node().parentNode).on('mouseout.' + this.id, function() {
            clearTimeout(this.hide_timeout);
            this.hide_timeout = setTimeout(function() { this.hide(); }.bind(this), 300);
        }.bind(this));
    }

    return this;

};

/**
 * Whether to persist the dashboard. Returns true if at least one component should persist, or if the panel is engaged
 *   in an active drag event.
 * @returns {boolean}
 */
LocusZoom.Dashboard.prototype.shouldPersist = function() {
    if (this.persist) { return true; }
    var persist = false;
    // Persist if at least one component should also persist
    this.components.forEach(function(component) {
        persist = persist || component.shouldPersist();
    });
    // Persist if in a parent drag event
    persist = persist || (this.parent_plot.panel_boundaries.dragging || this.parent_plot.interaction.dragging);
    return !!persist;
};

/**
 * Make the dashboard appear. If it doesn't exist yet create it, including creating/positioning all components within,
 *   and make sure it is set to be visible.
 */
LocusZoom.Dashboard.prototype.show = function() {
    if (!this.selector) {
        switch (this.type) {
        case 'plot':
            this.selector = d3.select(this.parent.svg.node().parentNode)
                .insert('div',':first-child');
            break;
        case 'panel':
            this.selector = d3.select(this.parent.parent.svg.node().parentNode)
                .insert('div', '.lz-data_layer-tooltip, .lz-dashboard-menu, .lz-curtain').classed('lz-panel-dashboard', true);
            break;
        }
        this.selector.classed('lz-dashboard', true).classed('lz-' + this.type + '-dashboard', true).attr('id', this.id);
    }
    this.components.forEach(function(component) { component.show(); });
    this.selector.style({ visibility: 'visible' });
    return this.update();
};

/**
 * Update the dashboard and rerender all child components. This can be called whenever plot state changes.
 * @returns {LocusZoom.Dashboard}
 */
LocusZoom.Dashboard.prototype.update = function() {
    if (!this.selector) { return this; }
    this.components.forEach(function(component) { component.update(); });
    return this.position();
};

/**
 * Position the dashboard (and child components) within the panel
 * @returns {LocusZoom.Dashboard}
 */
LocusZoom.Dashboard.prototype.position = function() {
    if (!this.selector) { return this; }
    // Position the dashboard itself (panel only)
    if (this.type === 'panel') {
        var page_origin = this.parent.getPageOrigin();
        var top = (page_origin.y + 3.5).toString() + 'px';
        var left = page_origin.x.toString() + 'px';
        var width = (this.parent.layout.width - 4).toString() + 'px';
        this.selector.style({ position: 'absolute', top: top, left: left, width: width });
    }
    // Recursively position components
    this.components.forEach(function(component) { component.position(); });
    return this;
};

/**
 * Hide the dashboard (make invisible but do not destroy). Will do nothing if `shouldPersist` returns true.
 *
 * @returns {LocusZoom.Dashboard}
 */
LocusZoom.Dashboard.prototype.hide = function() {
    if (!this.selector || this.shouldPersist()) { return this; }
    this.components.forEach(function(component) { component.hide(); });
    this.selector.style({ visibility: 'hidden' });
    return this;
};

/**
 * Completely remove dashboard and all child components. (may be overridden by persistence settings)
 * @param {Boolean} [force=false] If true, will ignore persistence settings and always destroy the dashboard
 * @returns {LocusZoom.Dashboard}
 */
LocusZoom.Dashboard.prototype.destroy = function(force) {
    if (typeof force == 'undefined') { force = false; }
    if (!this.selector) { return this; }
    if (this.shouldPersist() && !force) { return this; }
    this.components.forEach(function(component) { component.destroy(true); });
    this.components = [];
    this.selector.remove();
    this.selector = null;
    return this;
};

/**
 *
 * A dashboard component is an empty div rendered on a dashboard that can display custom
 * html of user interface elements. LocusZoom.Dashboard.Components is a singleton used to
 * define and manage an extendable collection of dashboard components.
 * (e.g. by LocusZoom.Dashboard.Components.add())
 * @class
 * @param {Object} layout A JSON-serializable object of layout configuration parameters
 * @param {('left'|'right')} [layout.position='left']  Whether to float the component left or right.
 * @param {('start'|'middle'|'end')} [layout.group_position] Buttons can optionally be gathered into a visually
 *  distinctive group whose elements are closer together. If a button is identified as the start or end of a group,
 *  it will be drawn with rounded corners and an extra margin of spacing from any button not part of the group.
 *  For example, the region_nav_plot dashboard is a defined as a group.
 * @param {('gray'|'red'|'orange'|'yellow'|'green'|'blue'|'purple'} [layout.color='gray']  Color scheme for the
 *   component. Applies to buttons and menus.
 * @param {LocusZoom.Dashboard} parent The dashboard that contains this component
*/
LocusZoom.Dashboard.Component = function(layout, parent) {
    /** @member {Object} */
    this.layout = layout || {};
    if (!this.layout.color) { this.layout.color = 'gray'; }

    /** @member {LocusZoom.Dashboard|*} */
    this.parent = parent || null;
    /**
     * Some dashboards are attached to a panel, rather than directly to a plot
     * @member {LocusZoom.Panel|null}
     */
    this.parent_panel = null;
    /** @member {LocusZoom.Plot} */
    this.parent_plot = null;
    /**
     * This is a reference to either the panel or the plot, depending on what the dashboard is
     *   tied to. Useful when absolutely positioning dashboard components relative to their SVG anchor.
     * @member {LocusZoom.Plot|LocusZoom.Panel}
     */
    this.parent_svg = null;
    if (this.parent instanceof LocusZoom.Dashboard) {
        // TODO: when is the immediate parent *not* a dashboard?
        if (this.parent.type === 'panel') {
            this.parent_panel = this.parent.parent;
            this.parent_plot = this.parent.parent.parent;
            this.parent_svg = this.parent_panel;
        } else {
            this.parent_plot = this.parent.parent;
            this.parent_svg = this.parent_plot;
        }
    }
    /** @member {d3.selection} */
    this.selector = null;
    /**
     * If this is an interactive component, it will contain a button or menu instance that handles the interactivity.
     *   There is a 1-to-1 relationship of dashboard component to button
     * @member {null|LocusZoom.Dashboard.Component.Button}
     */
    this.button  = null;
    /**
     * If any single component is marked persistent, it will bubble up to prevent automatic hide behavior on a
     *   component's parent dashboard. Check via `shouldPersist`
     * @protected
     * @member {Boolean}
     */
    this.persist = false;
    if (!this.layout.position) { this.layout.position = 'left'; }

    // TODO: Return value in constructor
    return this;
};
/**
 * Perform all rendering of component, including toggling visibility to true. Will initialize and create SVG element
 *   if necessary, as well as updating with new data and performing layout actions.
 */
LocusZoom.Dashboard.Component.prototype.show = function() {
    if (!this.parent || !this.parent.selector) { return; }
    if (!this.selector) {
        var group_position = (['start','middle','end'].indexOf(this.layout.group_position) !== -1 ? ' lz-dashboard-group-' + this.layout.group_position : '');
        this.selector = this.parent.selector.append('div')
            .attr('class', 'lz-dashboard-' + this.layout.position + group_position);
        if (this.layout.style) { this.selector.style(this.layout.style); }
        if (typeof this.initialize == 'function') { this.initialize(); }
    }
    if (this.button && this.button.status === 'highlighted') { this.button.menu.show(); }
    this.selector.style({ visibility: 'visible' });
    this.update();
    return this.position();
};
/**
 * Update the dashboard component with any new data or plot state as appropriate. This method performs all
 *  necessary rendering steps.
 */
LocusZoom.Dashboard.Component.prototype.update = function() { /* stub */ };
/**
 * Place the component correctly in the plot
 * @returns {LocusZoom.Dashboard.Component}
 */
LocusZoom.Dashboard.Component.prototype.position = function() {
    if (this.button) { this.button.menu.position(); }
    return this;
};
/**
 * Determine whether the component should persist (will bubble up to parent dashboard)
 * @returns {boolean}
 */
LocusZoom.Dashboard.Component.prototype.shouldPersist = function() {
    if (this.persist) { return true; }
    if (this.button && this.button.persist) { return true; }
    return false;
};
/**
 * Toggle visibility to hidden, unless marked as persistent
 * @returns {LocusZoom.Dashboard.Component}
 */
LocusZoom.Dashboard.Component.prototype.hide = function() {
    if (!this.selector || this.shouldPersist()) { return this; }
    if (this.button) { this.button.menu.hide(); }
    this.selector.style({ visibility: 'hidden' });
    return this;
};
/**
 * Completely remove component and button. (may be overridden by persistence settings)
 * @param {Boolean} [force=false] If true, will ignore persistence settings and always destroy the dashboard
 * @returns {LocusZoom.Dashboard}
 */
LocusZoom.Dashboard.Component.prototype.destroy = function(force) {
    if (typeof force == 'undefined') { force = false; }
    if (!this.selector) { return this; }
    if (this.shouldPersist() && !force) { return this; }
    if (this.button && this.button.menu) { this.button.menu.destroy(); }
    this.selector.remove();
    this.selector = null;
    this.button = null;
    return this;
};

/**
 * Singleton registry of all known components
 * @class
 * @static
 */
LocusZoom.Dashboard.Components = (function() {
    /** @lends LocusZoom.Dashboard.Components */
    var obj = {};
    var components = {};

    /**
     * Create a new component instance by name
     * @param {String} name The string identifier of the desired component
     * @param {Object} layout The layout to use to create the component
     * @param {LocusZoom.Dashboard} parent The containing dashboard to use when creating the component
     * @returns {LocusZoom.Dashboard.Component}
     */
    obj.get = function(name, layout, parent) {
        if (!name) {
            return null;
        } else if (components[name]) {
            if (typeof layout != 'object') {
                throw new Error('invalid layout argument for dashboard component [' + name + ']');
            } else {
                return new components[name](layout, parent);
            }
        } else {
            throw new Error('dashboard component [' + name + '] not found');
        }
    };
    /**
     * Add a new component constructor to the registry and ensure that it extends the correct parent class
     * @protected
     * @param name
     * @param component
     */
    obj.set = function(name, component) {
        if (component) {
            if (typeof component != 'function') {
                throw new Error('unable to set dashboard component [' + name + '], argument provided is not a function');
            } else {
                components[name] = component;
                components[name].prototype = new LocusZoom.Dashboard.Component();
            }
        } else {
            delete components[name];
        }
    };

    /**
     * Register a new component constructor by name
     * @param {String} name
     * @param {function} component The component constructor
     */
    obj.add = function(name, component) {
        if (components[name]) {
            throw new Error('dashboard component already exists with name: ' + name);
        } else {
            obj.set(name, component);
        }
    };

    /**
     * List the names of all registered components
     * @returns {String[]}
     */
    obj.list = function() {
        return Object.keys(components);
    };

    return obj;
})();

/**
 * Plots and panels may have a "dashboard" element suited for showing HTML components that may be interactive.
 *   When components need to incorporate a generic button, or additionally a button that generates a menu, this
 *   class provides much of the necessary framework.
 * @class
 * @param {LocusZoom.Dashboard.Component} parent
 */
LocusZoom.Dashboard.Component.Button = function(parent) {

    if (!(parent instanceof LocusZoom.Dashboard.Component)) {
        throw new Error('Unable to create dashboard component button, invalid parent');
    }
    /** @member {LocusZoom.Dashboard.Component} */
    this.parent = parent;
    /** @member {LocusZoom.Dashboard.Panel} */
    this.parent_panel = this.parent.parent_panel;
    /** @member {LocusZoom.Dashboard.Plot} */
    this.parent_plot = this.parent.parent_plot;
    /** @member {LocusZoom.Plot|LocusZoom.Panel} */
    this.parent_svg = this.parent.parent_svg;

    /** @member {LocusZoom.Dashboard|null|*} */
    this.parent_dashboard = this.parent.parent;
    /** @member {d3.selection} */
    this.selector = null;

    /**
     * Tag to use for the button (default: a)
     * @member {String}
     */
    this.tag = 'a';

    /**
     * TODO This method does not appear to be used anywhere
     * @param {String} tag
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.setTag = function(tag) {
        if (typeof tag != 'undefined') { this.tag = tag.toString(); }
        return this;
    };

    /**
     * HTML for the button to show.
     * @protected
     * @member {String}
     */
    this.html = '';
    /**
     * Specify the HTML content of this button.
     * WARNING: The string provided will be inserted into the document as raw markup; XSS mitigation is the
     *   responsibility of each button implementation.
     * @param {String} html
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.setHtml = function(html) {
        if (typeof html != 'undefined') { this.html = html.toString(); }
        return this;
    };
    /**
     * @deprecated since 0.5.6; use setHtml instead
     */
    this.setText = this.setHtml;

    /**
     * Mouseover title text for the button to show
     * @protected
     * @member {String}
     */
    this.title = '';
    /**
     * Set the mouseover title text for the button (if any)
     * @param {String} title Simple text to display
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.setTitle = function(title) {
        if (typeof title != 'undefined') { this.title = title.toString(); }
        return this;
    };

    /**
     * Color of the button
     * @member {String}
     */
    this.color = 'gray';

    /**
     * Set the color associated with this button
     * @param {('gray'|'red'|'orange'|'yellow'|'green'|'blue'|'purple')} color Any selection not in the preset list
     *   will be replaced with gray.
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.setColor = function(color) {
        if (typeof color != 'undefined') {
            if (['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'].indexOf(color) !== -1) { this.color = color; }
            else { this.color = 'gray'; }
        }
        return this;
    };

    /**
     * Hash of arbitrary button styles to apply as {name: value} entries
     * @protected
     * @member {Object}
     */
    this.style = {};
    /**
     * Set a collection of custom styles to be used by the button
     * @param {Object} style Hash of {name:value} entries
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.setStyle = function(style) {
        if (typeof style != 'undefined') { this.style = style; }
        return this;
    };

    //
    /**
     * Method to generate a CSS class string
     * @returns {string}
     */
    this.getClass = function() {
        var group_position = (['start','middle','end'].indexOf(this.parent.layout.group_position) !== -1 ? ' lz-dashboard-button-group-' + this.parent.layout.group_position : '');
        return 'lz-dashboard-button lz-dashboard-button-' + this.color + (this.status ? '-' + this.status : '') + group_position;
    };

    // Permanence
    /**
     * Track internal state on whether to keep showing the button/ menu contents at the moment
     * @protected
     * @member {Boolean}
     */
    this.persist = false;
    /**
     * Configuration when defining a button: track whether this component should be allowed to keep open
     *   menu/button contents in response to certain events
     * @protected
     * @member {Boolean}
     */
    this.permanent = false;
    /**
     * Allow code to change whether the button is allowed to be `permanent`
     * @param {boolean} bool
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.setPermanent = function(bool) {
        if (typeof bool == 'undefined') { bool = true; } else { bool = Boolean(bool); }
        this.permanent = bool;
        if (this.permanent) { this.persist = true; }
        return this;
    };
    /**
     * Determine whether the button/menu contents should persist in response to a specific event
     * @returns {Boolean}
     */
    this.shouldPersist = function() {
        return this.permanent || this.persist;
    };

    /**
     * Button status (highlighted / disabled/ etc)
     * @protected
     * @member {String}
     */
    this.status = '';
    /**
     * Change button state
     * @param {('highlighted'|'disabled'|'')} status
     */
    this.setStatus = function(status) {
        if (typeof status != 'undefined' && ['', 'highlighted', 'disabled'].indexOf(status) !== -1) { this.status = status; }
        return this.update();
    };
    /**
     * Toggle whether the button is highlighted
     * @param {boolean} bool If provided, explicitly set highlighted state
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.highlight = function(bool) {
        if (typeof bool == 'undefined') { bool = true; } else { bool = Boolean(bool); }
        if (bool) { return this.setStatus('highlighted'); }
        else if (this.status === 'highlighted') { return this.setStatus(''); }
        return this;
    };
    /**
     * Toggle whether the button is disabled
     * @param {boolean} bool If provided, explicitly set disabled state
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.disable = function(bool) {
        if (typeof bool == 'undefined') { bool = true; } else { bool = Boolean(bool); }
        if (bool) { return this.setStatus('disabled'); }
        else if (this.status === 'disabled') { return this.setStatus(''); }
        return this;
    };

    // Mouse events
    /** @member {function} */
    this.onmouseover = function() {};
    this.setOnMouseover = function(onmouseover) {
        if (typeof onmouseover == 'function') { this.onmouseover = onmouseover; }
        else { this.onmouseover = function() {}; }
        return this;
    };
    /** @member {function} */
    this.onmouseout = function() {};
    this.setOnMouseout = function(onmouseout) {
        if (typeof onmouseout == 'function') { this.onmouseout = onmouseout; }
        else { this.onmouseout = function() {}; }
        return this;
    };
    /** @member {function} */
    this.onclick = function() {};
    this.setOnclick = function(onclick) {
        if (typeof onclick == 'function') { this.onclick = onclick; }
        else { this.onclick = function() {}; }
        return this;
    };

    // Primary behavior functions
    /**
     * Show the button, including creating DOM elements if necessary for first render
     */
    this.show = function() {
        if (!this.parent) { return; }
        if (!this.selector) {
            this.selector = this.parent.selector.append(this.tag).attr('class', this.getClass());
        }
        return this.update();
    };
    /**
     * Hook for any actions or state cleanup to be performed before rerendering
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.preUpdate = function() { return this; };
    /**
     * Update button state and contents, and fully rerender
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.update = function() {
        if (!this.selector) { return this; }
        this.preUpdate();
        this.selector
            .attr('class', this.getClass())
            .attr('title', this.title).style(this.style)
            .on('mouseover', (this.status === 'disabled') ? null : this.onmouseover)
            .on('mouseout', (this.status === 'disabled') ? null : this.onmouseout)
            .on('click', (this.status === 'disabled') ? null : this.onclick)
            .html(this.html);
        this.menu.update();
        this.postUpdate();
        return this;
    };
    /**
     * Hook for any behavior to be added/changed after the button has been re-rendered
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.postUpdate = function() { return this; };
    /**
     * Hide the button by removing it from the DOM (may be overridden by current persistence setting)
     * @returns {LocusZoom.Dashboard.Component.Button}
     */
    this.hide = function() {
        if (this.selector && !this.shouldPersist()) {
            this.selector.remove();
            this.selector = null;
        }
        return this;
    };

    /**
     * Button Menu Object
     * The menu is an HTML overlay that can appear below a button. It can contain arbitrary HTML and
     *   has logic to be automatically positioned and sized to behave more or less like a dropdown menu.
     * @member {Object}
     */
    this.menu = {
        outer_selector: null,
        inner_selector: null,
        scroll_position: 0,
        hidden: true,
        /**
         * Show the button menu, including setting up any DOM elements needed for first rendering
         */
        show: function() {
            if (!this.menu.outer_selector) {
                this.menu.outer_selector = d3.select(this.parent_plot.svg.node().parentNode).append('div')
                    .attr('class', 'lz-dashboard-menu lz-dashboard-menu-' + this.color)
                    .attr('id', this.parent_svg.getBaseId() + '.dashboard.menu');
                this.menu.inner_selector = this.menu.outer_selector.append('div')
                    .attr('class', 'lz-dashboard-menu-content');
                this.menu.inner_selector.on('scroll', function() {
                    this.menu.scroll_position = this.menu.inner_selector.node().scrollTop;
                }.bind(this));
            }
            this.menu.outer_selector.style({ visibility: 'visible' });
            this.menu.hidden = false;
            return this.menu.update();
        }.bind(this),
        /**
         * Update the rendering of the menu
         */
        update: function() {
            if (!this.menu.outer_selector) { return this.menu; }
            this.menu.populate(); // This function is stubbed for all buttons by default and custom implemented in component definition
            if (this.menu.inner_selector) { this.menu.inner_selector.node().scrollTop = this.menu.scroll_position; }
            return this.menu.position();
        }.bind(this),
        position: function() {
            if (!this.menu.outer_selector) { return this.menu; }
            // Unset any explicitly defined outer selector height so that menus dynamically shrink if content is removed
            this.menu.outer_selector.style({ height: null });
            var padding = 3;
            var scrollbar_padding = 20;
            var menu_height_padding = 14; // 14: 2x 6px padding, 2x 1px border
            var page_origin = this.parent_svg.getPageOrigin();
            var page_scroll_top = document.documentElement.scrollTop || document.body.scrollTop;
            var container_offset = this.parent_plot.getContainerOffset();
            var dashboard_client_rect = this.parent_dashboard.selector.node().getBoundingClientRect();
            var button_client_rect = this.selector.node().getBoundingClientRect();
            var menu_client_rect = this.menu.outer_selector.node().getBoundingClientRect();
            var total_content_height = this.menu.inner_selector.node().scrollHeight;
            var top = 0; var left = 0;
            if (this.parent_dashboard.type === 'panel') {
                top = (page_origin.y + dashboard_client_rect.height + (2 * padding));
                left = Math.max(page_origin.x + this.parent_svg.layout.width - menu_client_rect.width - padding, page_origin.x + padding);
            } else {
                top = button_client_rect.bottom + page_scroll_top + padding - container_offset.top;
                left = Math.max(button_client_rect.left + button_client_rect.width - menu_client_rect.width - container_offset.left, page_origin.x + padding);
            }
            var base_max_width = Math.max(this.parent_svg.layout.width - (2 * padding) - scrollbar_padding, scrollbar_padding);
            var container_max_width = base_max_width;
            var content_max_width = (base_max_width - (4 * padding));
            var base_max_height = Math.max(this.parent_svg.layout.height - (10 * padding) - menu_height_padding, menu_height_padding);
            var height = Math.min(total_content_height, base_max_height);
            var max_height = base_max_height;
            this.menu.outer_selector.style({
                'top': top.toString() + 'px',
                'left': left.toString() + 'px',
                'max-width': container_max_width.toString() + 'px',
                'max-height': max_height.toString() + 'px',
                'height': height.toString() + 'px'
            });
            this.menu.inner_selector.style({ 'max-width': content_max_width.toString() + 'px' });
            this.menu.inner_selector.node().scrollTop = this.menu.scroll_position;
            return this.menu;
        }.bind(this),
        hide: function() {
            if (!this.menu.outer_selector) { return this.menu; }
            this.menu.outer_selector.style({ visibility: 'hidden' });
            this.menu.hidden = true;
            return this.menu;
        }.bind(this),
        destroy: function() {
            if (!this.menu.outer_selector) { return this.menu; }
            this.menu.inner_selector.remove();
            this.menu.outer_selector.remove();
            this.menu.inner_selector = null;
            this.menu.outer_selector = null;
            return this.menu;
        }.bind(this),
        /**
         * Internal method definition
         * By convention populate() does nothing and should be reimplemented with each dashboard button definition
         *   Reimplement by way of Dashboard.Component.Button.menu.setPopulate to define the populate method and hook
         *   up standard menu click-toggle behavior prototype.
         * @protected
         */
        populate: function() { /* stub */ }.bind(this),
        /**
         * Define how the menu is populated with items, and set up click and display properties as appropriate
         * @public
         */
        setPopulate: function(menu_populate_function) {
            if (typeof menu_populate_function == 'function') {
                this.menu.populate = menu_populate_function;
                this.setOnclick(function() {
                    if (this.menu.hidden) {
                        this.menu.show();
                        this.highlight().update();
                        this.persist = true;
                    } else {
                        this.menu.hide();
                        this.highlight(false).update();
                        if (!this.permanent) { this.persist = false; }
                    }
                }.bind(this));
            } else {
                this.setOnclick();
            }
            return this;
        }.bind(this)
    };

};

/**
 * Renders arbitrary text with title formatting
 * @class LocusZoom.Dashboard.Components.title
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {string} layout.title Text to render
 */
LocusZoom.Dashboard.Components.add('title', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.show = function() {
        if (!this.div_selector) {
            this.div_selector = this.parent.selector.append('div')
                .attr('class', 'lz-dashboard-title lz-dashboard-' + this.layout.position);
            this.title_selector = this.div_selector.append('h3');
        }
        return this.update();
    };
    this.update = function() {
        var title = layout.title.toString();
        if (this.layout.subtitle) { title += ' <small>' + this.layout.subtitle + '</small>'; }
        this.title_selector.html(title);
        return this;
    };
});

/**
 * Renders text to display the current dimensions of the plot. Automatically updated as plot dimensions change
 * @class LocusZoom.Dashboard.Components.dimensions
 * @augments LocusZoom.Dashboard.Component
 */
LocusZoom.Dashboard.Components.add('dimensions', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        var display_width = this.parent_plot.layout.width.toString().indexOf('.') === -1 ? this.parent_plot.layout.width : this.parent_plot.layout.width.toFixed(2);
        var display_height = this.parent_plot.layout.height.toString().indexOf('.') === -1 ? this.parent_plot.layout.height : this.parent_plot.layout.height.toFixed(2);
        this.selector.html(display_width + 'px × ' + display_height + 'px');
        if (layout.class) { this.selector.attr('class', layout.class); }
        if (layout.style) { this.selector.style(layout.style); }
        return this;
    };
});

/**
 * Display the current scale of the genome region displayed in the plot, as defined by the difference between
 *  `state.end` and `state.start`.
 * @class LocusZoom.Dashboard.Components.region_scale
 * @augments LocusZoom.Dashboard.Component
 */
LocusZoom.Dashboard.Components.add('region_scale', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        if (!isNaN(this.parent_plot.state.start) && !isNaN(this.parent_plot.state.end)
            && this.parent_plot.state.start !== null && this.parent_plot.state.end !== null) {
            this.selector.style('display', null);
            this.selector.html(LocusZoom.positionIntToString(this.parent_plot.state.end - this.parent_plot.state.start, null, true));
        } else {
            this.selector.style('display', 'none');
        }
        if (layout.class) { this.selector.attr('class', layout.class); }
        if (layout.style) { this.selector.style(layout.style); }
        return this;
    };
});

/**
 * Button to export current plot to an SVG image
 * @class LocusZoom.Dashboard.Components.download
 * @augments LocusZoom.Dashboard.Component
 * @param {string} [layout.button_html="Download Image"]
 * @param {string} [layout.button_title="Download image of the current plot as locuszoom.svg"]
 * @param {string} [layout.filename="locuszoom.svg"] The default filename to use when saving the image
 */
LocusZoom.Dashboard.Components.add('download', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        if (this.button) { return this; }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color)
            .setHtml(layout.button_html || 'Download Image')
            .setTitle(layout.button_title || 'Download image of the current plot as locuszoom.svg')
            .setOnMouseover(function() {
                this.button.selector
                    .classed('lz-dashboard-button-gray-disabled', true)
                    .html('Preparing Image');
                this.generateBase64SVG().then(function(url) {
                    var old = this.button.selector.attr('href');
                    if (old) { URL.revokeObjectURL(old); }  // Clean up old url instance to prevent memory leaks
                    this.button.selector
                        .attr('href', url)
                        .classed('lz-dashboard-button-gray-disabled', false)
                        .classed('lz-dashboard-button-gray-highlighted', true)
                        .html(layout.button_html || 'Download Image');
                }.bind(this));
            }.bind(this))
            .setOnMouseout(function() {
                this.button.selector.classed('lz-dashboard-button-gray-highlighted', false);
            }.bind(this));
        this.button.show();
        this.button.selector.attr('href-lang', 'image/svg+xml').attr('download', layout.filename || 'locuszoom.svg');
        return this;
    };
    this.css_string = '';
    for (var stylesheet in Object.keys(document.styleSheets)) {
        if ( document.styleSheets[stylesheet].href !== null
             && document.styleSheets[stylesheet].href.indexOf('locuszoom.css') !== -1) {
            // TODO: "Download image" button will render the image incorrectly if the stylesheet has been renamed or concatenated
            LocusZoom.createCORSPromise('GET', document.styleSheets[stylesheet].href)
                .then(function(response) {
                    this.css_string = response.replace(/[\r\n]/g,' ').replace(/\s+/g,' ');
                    if (this.css_string.indexOf('/* ! LocusZoom HTML Styles */')) {
                        this.css_string = this.css_string.substring(0, this.css_string.indexOf('/* ! LocusZoom HTML Styles */'));
                    }
                }.bind(this));
            break;
        }
    }
    this.generateBase64SVG = function() {
        return new Promise(function (resolve, reject) {
            // Insert a hidden div, clone the node into that so we can modify it with d3
            var container = this.parent.selector.append('div').style('display', 'none')
                .html(this.parent_plot.svg.node().outerHTML);
            // Remove unnecessary elements
            container.selectAll('g.lz-curtain').remove();
            container.selectAll('g.lz-mouse_guide').remove();
            // Convert units on axis tick dy attributes from ems to pixels
            container.selectAll('g.tick text').each(function() {
                var dy = +(d3.select(this).attr('dy').substring(-2).slice(0,-2)) * 10;
                d3.select(this).attr('dy', dy);
            });
            // Pull the svg into a string and add the contents of the locuszoom stylesheet
            // Don't add this with d3 because it will escape the CDATA declaration incorrectly
            var initial_html = d3.select(container.select('svg').node().parentNode).html();
            var style_def = '<style type="text/css"><![CDATA[ ' + this.css_string + ' ]]></style>';
            var insert_at = initial_html.indexOf('>') + 1;
            initial_html = initial_html.slice(0,insert_at) + style_def + initial_html.slice(insert_at);
            // Delete the container node
            container.remove();
            // Create an object URL based on the rendered markup
            var content = new Blob([initial_html], { type: 'image/svg+xml' });
            resolve(URL.createObjectURL(content));
        }.bind(this));
    };
});

/**
 * Button to remove panel from plot.
 *   NOTE: Will only work on panel dashboards.
 * @class LocusZoom.Dashboard.Components.remove_panel
 * @augments LocusZoom.Dashboard.Component
 * @param {Boolean} [layout.suppress_confirm=false] If true, removes the panel without prompting user for confirmation
 */
LocusZoom.Dashboard.Components.add('remove_panel', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        if (this.button) { return this; }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color)
            .setHtml('×')
            .setTitle('Remove panel')
            .setOnclick(function() {
                if (!layout.suppress_confirm && !confirm('Are you sure you want to remove this panel? This cannot be undone!')) {
                    return false;
                }
                var panel = this.parent_panel;
                panel.dashboard.hide(true);
                d3.select(panel.parent.svg.node().parentNode).on('mouseover.' + panel.getBaseId() + '.dashboard', null);
                d3.select(panel.parent.svg.node().parentNode).on('mouseout.' + panel.getBaseId() + '.dashboard', null);
                return panel.parent.removePanel(panel.id);
            }.bind(this));
        this.button.show();
        return this;
    };
});

/**
 * Button to move panel up relative to other panels (in terms of y-index on the page)
 *   NOTE: Will only work on panel dashboards.
 * @class LocusZoom.Dashboard.Components.move_panel_up
 * @augments LocusZoom.Dashboard.Component
 */
LocusZoom.Dashboard.Components.add('move_panel_up', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        if (this.button) {
            var is_at_top = (this.parent_panel.layout.y_index === 0);
            this.button.disable(is_at_top);
            return this;
        }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color)
            .setHtml('▴')
            .setTitle('Move panel up')
            .setOnclick(function() {
                this.parent_panel.moveUp();
                this.update();
            }.bind(this));
        this.button.show();
        return this.update();
    };
});

/**
 * Button to move panel down relative to other panels (in terms of y-index on the page)
 *   NOTE: Will only work on panel dashboards.
 * @class LocusZoom.Dashboard.Components.move_panel_down
 * @augments LocusZoom.Dashboard.Component
 */
LocusZoom.Dashboard.Components.add('move_panel_down', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        if (this.button) {
            var is_at_bottom = (this.parent_panel.layout.y_index === this.parent_plot.panel_ids_by_y_index.length - 1);
            this.button.disable(is_at_bottom);
            return this;
        }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color)
            .setHtml('▾')
            .setTitle('Move panel down')
            .setOnclick(function() {
                this.parent_panel.moveDown();
                this.update();
            }.bind(this));
        this.button.show();
        return this.update();
    };
});

/**
 * Button to shift plot region forwards or back by a `step` increment provided in the layout
 * @class LocusZoom.Dashboard.Components.shift_region
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {number} [layout.step=50000] The stepsize to change the region by
 * @param {string} [layout.button_html]
 * @param {string} [layout.button_title]
 */
LocusZoom.Dashboard.Components.add('shift_region', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    if (isNaN(this.parent_plot.state.start) || isNaN(this.parent_plot.state.end)) {
        this.update = function() {};
        console.warn('Unable to add shift_region dashboard component: plot state does not have region bounds');
        return;
    }
    if (isNaN(layout.step) || layout.step === 0) { layout.step = 50000; }
    if (typeof layout.button_html !== 'string') { layout.button_html = layout.step > 0 ? '>' : '<'; }
    if (typeof layout.button_title !== 'string') {
        layout.button_title = 'Shift region by ' + (layout.step > 0 ? '+' : '-') + LocusZoom.positionIntToString(Math.abs(layout.step),null,true);
    }
    this.update = function() {
        if (this.button) { return this; }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color)
            .setHtml(layout.button_html)
            .setTitle(layout.button_title)
            .setOnclick(function() {
                this.parent_plot.applyState({
                    start: Math.max(this.parent_plot.state.start + layout.step, 1),
                    end: this.parent_plot.state.end + layout.step
                });
            }.bind(this));
        this.button.show();
        return this;
    };
});

/**
 * Zoom in or out on the plot, centered on the middle of the plot region, by the specified amount
 * @class LocusZoom.Dashboard.Components.zoom_region
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {number} [layout.step=0.2] The amount to zoom in by (where 1 indicates 100%)
 */
LocusZoom.Dashboard.Components.add('zoom_region', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    if (isNaN(this.parent_plot.state.start) || isNaN(this.parent_plot.state.end)) {
        this.update = function() {};
        console.warn('Unable to add zoom_region dashboard component: plot state does not have region bounds');
        return;
    }
    if (isNaN(layout.step) || layout.step === 0) { layout.step = 0.2; }
    if (typeof layout.button_html != 'string') { layout.button_html = layout.step > 0 ? 'z–' : 'z+'; }
    if (typeof layout.button_title != 'string') {
        layout.button_title = 'Zoom region ' + (layout.step > 0 ? 'out' : 'in') + ' by ' + (Math.abs(layout.step) * 100).toFixed(1) + '%';
    }
    this.update = function() {
        if (this.button) {
            var can_zoom = true;
            var current_region_scale = this.parent_plot.state.end - this.parent_plot.state.start;
            if (layout.step > 0 && !isNaN(this.parent_plot.layout.max_region_scale) && current_region_scale >= this.parent_plot.layout.max_region_scale) {
                can_zoom = false;
            }
            if (layout.step < 0 && !isNaN(this.parent_plot.layout.min_region_scale) && current_region_scale <= this.parent_plot.layout.min_region_scale) {
                can_zoom = false;
            }
            this.button.disable(!can_zoom);
            return this;
        }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color)
            .setHtml(layout.button_html)
            .setTitle(layout.button_title)
            .setOnclick(function() {
                var current_region_scale = this.parent_plot.state.end - this.parent_plot.state.start;
                var zoom_factor = 1 + layout.step;
                var new_region_scale = current_region_scale * zoom_factor;
                if (!isNaN(this.parent_plot.layout.max_region_scale)) {
                    new_region_scale = Math.min(new_region_scale, this.parent_plot.layout.max_region_scale);
                }
                if (!isNaN(this.parent_plot.layout.min_region_scale)) {
                    new_region_scale = Math.max(new_region_scale, this.parent_plot.layout.min_region_scale);
                }
                var delta = Math.floor((new_region_scale - current_region_scale) / 2);
                this.parent_plot.applyState({
                    start: Math.max(this.parent_plot.state.start - delta, 1),
                    end: this.parent_plot.state.end + delta
                });
            }.bind(this));
        this.button.show();
        return this;
    };
});

/**
 * Renders button with arbitrary text that, when clicked, shows a dropdown containing arbitrary HTML
 *  NOTE: Trusts content exactly as given. XSS prevention is the responsibility of the implementer.
 * @class LocusZoom.Dashboard.Components.menu
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {string} layout.button_html The HTML to render inside the button
 * @param {string} layout.button_title Text to display as a tooltip when hovering over the button
 * @param {string} layout.menu_html The HTML content of the dropdown menu
 */
LocusZoom.Dashboard.Components.add('menu', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        if (this.button) { return this; }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color).setHtml(layout.button_html).setTitle(layout.button_title);
        this.button.menu.setPopulate(function() {
            this.button.menu.inner_selector.html(layout.menu_html);
        }.bind(this));
        this.button.show();
        return this;
    };
});


/**
 * Button to resize panel height to fit available data (eg when showing a list of tracks)
 * @class LocusZoom.Dashboard.Components.resize_to_data
 * @augments LocusZoom.Dashboard.Component
 * @param {string} [layout.button_html="Resize to Data"]
 * @param {string} [layout.button_title]
 */
LocusZoom.Dashboard.Components.add('resize_to_data', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        if (this.button) { return this; }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color)
            .setHtml(layout.button_html || 'Resize to Data')
            .setTitle(layout.button_title || 'Automatically resize this panel to show all data available')
            .setOnclick(function() {
                this.parent_panel.scaleHeightToData();
                this.update();
            }.bind(this));
        this.button.show();
        return this;
    };
});

/**
 * Button to toggle legend
 * @class LocusZoom.Dashboard.Components.toggle_legend
 * @augments LocusZoom.Dashboard.Component
 */
LocusZoom.Dashboard.Components.add('toggle_legend', function(layout) {
    LocusZoom.Dashboard.Component.apply(this, arguments);
    this.update = function() {
        var html = this.parent_panel.legend.layout.hidden ? 'Show Legend' : 'Hide Legend';
        if (this.button) {
            this.button.setHtml(html).show();
            this.parent.position();
            return this;
        }
        this.button = new LocusZoom.Dashboard.Component.Button(this)
            .setColor(layout.color)
            .setTitle('Show or hide the legend for this panel')
            .setOnclick(function() {
                this.parent_panel.legend.layout.hidden = !this.parent_panel.legend.layout.hidden;
                this.parent_panel.legend.render();
                this.update();
            }.bind(this));
        return this.update();
    };
});

/**
 * Dropdown menu allowing the user to choose between different display options for a single specific data layer
 *  within a panel.
 *
 * This allows controlling how points on a datalayer can be displayed- any display options supported via the layout for the target datalayer. This includes point
 *  size/shape, coloring, etc.
 *
 * This button intentionally limits display options it can control to those available on common plot types.
 *   Although the list of options it sets can be overridden (to control very special custom plot types), this
 *   capability should be used sparingly if at all.
 *
 * @class LocusZoom.Dashboard.Components.display_options
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {String} [layout.button_html="Display options..."] Text to display on the toolbar button
 * @param {String} [layout.button_title="Control how plot items are displayed"] Hover text for the toolbar button
 * @param {string} layout.layer_name Specify the datalayer that this button should affect
 * @param {string} [layout.default_config_display_name] Store the default configuration for this datalayer
 *  configuration, and show a button to revert to the "default" (listing the human-readable display name provided)
 * @param {Array} [layout.fields_whitelist='see code'] The list of presentation fields that this button can control.
 *  This can be overridden if this button needs to be used on a custom layer type with special options.
 * @typedef {{display_name: string, display: Object}} DisplayOptionsButtonConfigField
 * @param {DisplayOptionsButtonConfigField[]} layout.options Specify a label and set of layout directives associated
 *  with this `display` option. Display field should include all changes to datalayer presentation options.
 */
LocusZoom.Dashboard.Components.add('display_options', function (layout) {
    if (typeof layout.button_html != 'string') { layout.button_html = 'Display options...'; }
    if (typeof layout.button_title != 'string') { layout.button_title = 'Control how plot items are displayed'; }

    // Call parent constructor
    LocusZoom.Dashboard.Component.apply(this, arguments);

    // Whitelist of layout fields that this button is allowed to control. This ensures that we don't override any other
    //  information (like plot height etc) while changing point rendering
    var allowed_fields = layout.fields_whitelist || ['color', 'filters', 'fill_opacity', 'label', 'legend',
        'point_shape', 'point_size', 'tooltip', 'tooltip_positioning'];

    var dataLayer = this.parent_panel.data_layers[layout.layer_name];
    if (!dataLayer) {
        throw new Error("Display options could not locate the specified layer_name: '" + layout.layer_name + "'");
    }
    var dataLayerLayout = dataLayer.layout;

    // Store default configuration for the layer as a clean deep copy, so we may revert later
    var defaultConfig = {};
    allowed_fields.forEach(function(name) {
        var configSlot = dataLayerLayout[name];
        if (configSlot !== undefined) {
            defaultConfig[name] = JSON.parse(JSON.stringify(configSlot));
        }
    });

    /**
     * Which item in the menu is currently selected. (track for rerendering menu)
     * @member {String}
     * @private
     */
    this._selected_item = 'default';

    // Define the button + menu that provides the real functionality for this dashboard component
    var self = this;
    this.button = new LocusZoom.Dashboard.Component.Button(self)
        .setColor(layout.color)
        .setHtml(layout.button_html)
        .setTitle(layout.button_title)
        .setOnclick(function () {
            self.button.menu.populate();
        });
    this.button.menu.setPopulate(function () {
        // Multiple copies of this button might be used on a single LZ page; append unique IDs where needed
        var uniqueID = Math.floor(Math.random() * 1e4).toString();

        self.button.menu.inner_selector.html('');
        var table = self.button.menu.inner_selector.append('table');

        var menuLayout = self.layout;

        var renderRow = function(display_name, display_options, row_id) { // Helper method
            var row = table.append('tr');
            var radioId = '' + uniqueID + row_id;
            row.append('td')
                .append('input')
                .attr({id: radioId, type: 'radio', name: 'display-option-' + uniqueID, value: row_id})
                .style('margin', 0) // Override css libraries (eg skeleton) that style form inputs
                .property('checked', (row_id === self._selected_item))
                .on('click', function () {
                    // If an option is not specified in these display options, use the original defaults
                    allowed_fields.forEach(function(field_name) {
                        dataLayer.layout[field_name] = display_options[field_name] || defaultConfig[field_name];
                    });

                    self._selected_item = row_id;
                    self.parent_panel.render();
                    var legend = self.parent_panel.legend;
                    if (legend) {
                        legend.render();
                    }
                });
            row.append('td').append('label')
                .style('font-weight', 'normal')
                .attr('for', radioId)
                .text(display_name);
        };
        // Render the "display options" menu: default and special custom options
        var defaultName = menuLayout.default_config_display_name || 'Default style';
        renderRow(defaultName, defaultConfig, 'default');
        menuLayout.options.forEach(function (item, index) {
            renderRow(item.display_name, item.display, index);
        });
        return self;
    });

    this.update = function () {
        this.button.show();
        return this;
    };
});

/**
 * Dropdown menu allowing the user to set the value of a specific `state_field` in plot.state
 * This is useful for things (like datasources) that allow dynamic configuration based on global information in state
 *
 * For example, the LDLZ2 data source can use it to change LD reference population (for all panels) after render
 *
 * @class LocusZoom.Dashboard.Components.set_state
 * @augments LocusZoom.Dashboard.Component
 * @param {object} layout
 * @param {String} [layout.button_html="Set option..."] Text to display on the toolbar button
 * @param {String} [layout.button_title="Choose an option to customize the plot"] Hover text for the toolbar button
 * @param {bool} [layout.show_selected=false] Whether to append the selected value to the button label
 * @param {string} [layout.state_field] The name of the field in plot.state that will be set by this button
 * @typedef {{display_name: string, value: *}} SetStateOptionsConfigField
 * @param {SetStateOptionsConfigField[]} layout.options Specify human labels and associated values for the dropdown menu
 */
LocusZoom.Dashboard.Components.add('set_state', function (layout) {
    var self = this;
    if (typeof layout.button_html != 'string') { layout.button_html = 'Set option...'; }
    if (typeof layout.button_title != 'string') { layout.button_title = 'Choose an option to customize the plot'; }

    // Call parent constructor
    LocusZoom.Dashboard.Component.apply(this, arguments);

    if (this.parent_panel) {
        throw new Error('This widget is designed to set global options, so it can only be used at the top (plot) level');
    }
    if (!layout.state_field) {
        throw new Error('Must specify the `state_field` that this widget controls');
    }

    /**
     * Which item in the menu is currently selected. (track for rerendering menu)
     * @member {String}
     * @private
     */
    // The first option listed is automatically assumed to be the default, unless a value exists in plot.state
    this._selected_item = this.parent_plot.state[layout.state_field] || layout.options[0].value;
    if (!layout.options.find(function(item) { return item.value === self._selected_item; })) {
        // Check only gets run at widget creation, but generally this widget is assumed to be an exclusive list of options
        throw new Error('There is an existing state value that does not match the known values in this widget');
    }

    // Define the button + menu that provides the real functionality for this dashboard component
    this.button = new LocusZoom.Dashboard.Component.Button(self)
        .setColor(layout.color)
        .setHtml(layout.button_html + (layout.show_selected ? this._selected_item : ''))
        .setTitle(layout.button_title)
        .setOnclick(function () {
            self.button.menu.populate();
        });
    this.button.menu.setPopulate(function () {
        // Multiple copies of this button might be used on a single LZ page; append unique IDs where needed
        var uniqueID = Math.floor(Math.random() * 1e4).toString();

        self.button.menu.inner_selector.html('');
        var table = self.button.menu.inner_selector.append('table');

        var renderRow = function(display_name, value, row_id) { // Helper method
            var row = table.append('tr');
            var radioId = '' + uniqueID + row_id;
            row.append('td')
                .append('input')
                .attr({id: radioId, type: 'radio', name: 'set-state-' + uniqueID, value: row_id})
                .style('margin', 0) // Override css libraries (eg skeleton) that style form inputs
                .property('checked', (value === self._selected_item))
                .on('click', function () {
                    var new_state = {};
                    new_state[layout.state_field] = value;
                    self._selected_item = value;
                    self.parent_plot.applyState(new_state);
                    self.button.setHtml(layout.button_html + (layout.show_selected ? self._selected_item : ''));
                });
            row.append('td').append('label')
                .style('font-weight', 'normal')
                .attr('for', radioId)
                .text(display_name);
        };
        layout.options.forEach(function (item, index) {
            renderRow(item.display_name, item.value, index);
        });
        return self;
    });

    this.update = function () {
        this.button.show();
        return this;
    };
});
