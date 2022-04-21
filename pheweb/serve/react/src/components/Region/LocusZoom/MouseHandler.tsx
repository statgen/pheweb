import { DataSourceKeys, Params } from "../RegionModel";
import { Data, DataSources } from "locuszoom";
import { selectAll } from "d3";
import "../Region.css";

const positionFieldName = (key : DataSourceKeys) : string => {
    let fieldName : string;
    switch(key){
        case "gwas_cat":
            fieldName = "gwas_cat:pos";
            break;
        default:
            fieldName = `${key}:position`
    }
    return fieldName;
}

const dataLayerIds  = (key : DataSourceKeys) : string [] => {
    let layerIds : string[];
    switch(key){
        case "colocalization":
            layerIds = ["lz-1.colocalization.colocalization_pip1.data_layer" ,
                        "lz-1.colocalization.colocalization_pip2.data_layer"];
            break;
        default:
            layerIds = [`lz-1.${key}.associationpvalues.data_layer`]
            break;
    }
    return layerIds;
}

const dataLayerHandler = (setSelectedPosition : (position : number |undefined) => void) =>
                         (key : DataSourceKeys) =>
                         (id : string) : ((position : number | undefined) => void) => {

    const selector = `[id='${id}'] path`;
    const fieldName: string = positionFieldName(key);
    const index = {};

    const dots = selectAll(selector);
    dots.each((d: { [k: string]: any }, i: number) => {
        /* d : an object containing a data element
         * of the locus zoom plot e.g. for colocalizaiton
         * the keys will :
         * [ colocalization:beta1 , colocalization:count_cs , colocalization:causal_variant_id , ... ]
         * */
        index[d[fieldName]] = i;
    });

    dots.on('mouseover', (m, data) => {
        setSelectedPosition(data[fieldName] as number);
    });

    dots.on('mouseout', (m, data) => {
        setSelectedPosition(undefined);
    });

    return (position : number | undefined) => {
        if(position === undefined){
            selectAll(selector).classed('lz-highlight', false);
        } else if(index[position]){
            selectAll(selector).filter((d, j) => j === index[position]).classed('lz-highlight', true);
        }
    }
}

export const updateMousehandler =
    (setSelectedPosition : (position : number |undefined) => void,
     dataSources : DataSources,
     key : DataSourceKeys) => {
        var params : Params | undefined = dataSources.sources[key]?.params as Params | undefined
        if(params !== undefined) {
            const handlers : ((position : number | undefined) => void)[] = [];
            const ids : string [] = dataLayerIds(key);
            ids.forEach((id : string) =>  handlers.push(dataLayerHandler(setSelectedPosition)(key)(id)));
            params.handlers = handlers;
        }
    }

export const removeMousehandler =
    (dataSources : DataSources) =>
    (key : DataSourceKeys) => {
        var params : Params | undefined = dataSources.sources[key]?.params as Params | undefined
        params && (params.handlers = undefined);
    }

export const processMouseUpdates =
    (selectedPosition : number |undefined,dataSources : DataSources) =>
    Object.values(dataSources.sources).forEach((value : Data.Source)=> {
        (value.params as Params).handlers?.forEach(h => h(selectedPosition));
    } );
