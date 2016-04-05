// TODO:
// - Color tooltips.
// - Bold only the phewas_string in tooltips.
// - y axis label "p-value"
// - Show categories on x_axis.
//    + Figure out how many points in each category.
//    + Get an endpoint for each category.
//    + Find a font size and box width that accomodates all category names.
//    + Rotate text counterclockwise a bit.
// - On click, pheno_points show a GWAS of top 5000 positions. Also, icd9 codes.
// - Display a significance threshold.

console.log(window.variant);

// TODO: maybe do: svg_width = $("svg")style("width", "100%").width() using a col-xs-10
var svg_width = $(window).width() * 11 / 12;
var svg_height = 300;

var plot_margin = {
    'left': 50,
    'right': 10,
    'top': 10,
    'bottom': 40,
};

var plot_width = svg_width - plot_margin.left - plot_margin.right;
var plot_height = svg_height - plot_margin.top - plot_margin.bottom;


var x_scale = d3.scale.linear()
    .domain([0, window.variant.phenos.length])
    .range([0, plot_width]);

var pval_extent = d3.extent(window.variant.phenos, function(d) {
    return d.pval;
});
console.log(pval_extent);
var y_scale = d3.scale.log() // TODO: log scale, or something else.
    .domain(pval_extent)
    .range([0, plot_height]);

var unique_categories = d3.set(window.variant.phenos.map(function(cat) {
    return cat.category_name;
})).values();
var color_by_category = d3.scale.category20()
    .domain(unique_categories);

window.d3_tooltip = d3.tip()
    .attr('class', 'd3-tip')
    .html(function(d) {
        return [
            d.category_name,
            d.phewas_string,
            '',
            'phewas code: ' + d.phewas_code,
            'pval: ' + d.pval,
            '#cases: ' + d.num_cases,
            '#controls: ' + d.num_controls
        ].join('<br>');
    })
    .offset([-8,0]);

function create_phewas_plot() {
    var phewas_svg = d3.select('#phewas_plot_container').append("svg")
        .attr('id', 'phewas_svg')
        .attr("width", svg_width)
        .attr("height", svg_height)
        .style("display", "block")
        .style("margin", "auto");
    var phewas_plot = phewas_svg.append("g")
        .attr('id', 'phewas_plot')
        .attr("transform", "translate(" + plot_margin.left + "," + plot_margin.top + ")");

    phewas_svg.call(window.d3_tooltip);

    phewas_plot.selectAll('a.pheno_point')
        .data(window.variant.phenos)
        .enter()
        .append('a')
        .attr('class', 'pheno_point')
        .append('circle')
        .attr('cx', function(d, i) {
            return x_scale(i);
        })
        .attr('cy', function(d) {
            return y_scale(d.pval);
        })
        .attr('r', 3)
        .attr('fill', function(d) {
            return color_by_category(d.category_name);
        })
        .on('mouseover', window.d3_tooltip.show)
        .on('mouseout', window.d3_tooltip.hide);

    var yAxis = d3.svg.axis()
        .scale(y_scale)
        .orient("left");
    phewas_plot.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    var xAxis = d3.svg.axis()
        .scale(x_scale)
        .orient("bottom");
    phewas_plot.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + plot_height + ")")
        .call(xAxis);
}

$(create_phewas_plot);
