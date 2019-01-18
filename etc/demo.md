## Demo Navigating PheWeb

On the homepage use the **search bar** to look up particular (1) genes (e.g. _APOB_, _FTO_, _TCF7L2_), (2) variants (by either rsID or chromosome:position on the appropriate genome build), or phenotypes/traits. 
Note: View a list of traits on the PheWeb on the About page. 
In any view, clicking on the PheWeb icon on the top left corner will allow you to return to the homepage. 

If you are feeling adventurous, hit the **Random** icon in the top panel to view a randomly selected view from the PheWeb. 
Selecting **Top Hits** in this panel will present a list of the most significant associations in this PheWeb in table format. 
To learn more about the data behind the PheWeb select **About**.

PheWeb shows 3 types of views: `Manhattan` + `quantile-quantile (QQ)` plots, `LocusZoom` plots, and `PheWAS` plots.

Below I am looking up _TCF7L2_ in the search bar:

![](/etc/images/screen-homepage-search.png?raw=true)

Searching by gene will show you the most significant associations in that gene (table format) and a `LocusZoom` regional view showing the linkage disequilibrium among the variants in the region around the gene (below). 
Selecting a different row in the table will change the `LocusZoom` plot accordingly.

In my _TCF7L2_ search, this page appears, in which the `LocusZoom` plot below is displaying the row in the table that is selected (“Type 1 diabetes”):

![](/etc/images/screen-lz.png?raw=true)

All plots are interactive. You can hover your mouse above variants to learn more information about them, for example in the `LocusZoom` plot:

![](/etc/images/screen-lz-tooltip.png?raw=true)

Clicking on a variant in the `LocusZoom plot` will display a `PheWAS` view showing the association p-value for the variant across all the phenotypes in the PheWeb. 
In the `PheWAS` view an upwards facing triangle implies a positive effect of that variant on the phenotype, whereas a downwards facing triangle implies a negative effect. 
Circles are used for variants in which the estimate of the beta is not precise (e.g. standard error encompassing zero). The variants are colored according to a user-specified biological grouping.

I decided to select a _TCF7L2_ variant from the previous screenshot, and here is the `PheWAS` view followed by a table summary:

![](/etc/images/screen-phewas.png?raw=true)

Selecting a trait in the `PheWAS` plot will navigate you to the Manhattan plot view. Below the `Manhattan` is a table showing the most significant associations, and below that is the `quantile-quantile (QQ)` plot stratified by minor allele frequency bin and the genomic control lambda calculated from various percentiles of variants. 

Below I selected “Stricture of Artery” from the `PheWAS` view, and am hovering my mouse over a variant in the `Manhattan` plot. 
If I select this variant I will be brought to its `LocusZoom` regional plot.

![](/etc/images/screen-manhattan.png?raw=true)

Scrolling down on the same page I see the `QQ` plot below the table of top associations: 

![](/etc/images/screen-qq.png?raw=true)

