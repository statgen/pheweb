import React, { useState, useEffect , useContext , Fragment } from 'react';
import {CondFMRegions, layout_types, Region} from "../RegionModel";
import {RegionContext, RegionState} from "../RegionContext";

interface Prop {}

interface Params { allData : { type : layout_types , data : unknown , conditioned_on : string }[] ,
                               fields : unknown ,
                               outnames : unknown,
                               trans : unknown ,
                               dataIndex : number };

export const RegionSelectFinemapping = (prop : Prop) => {
    const { region : {cond_fm_regions} = {} ,
            locusZoomContext : { dataSources , plot } = {} } = useContext<Partial<RegionState>>(RegionContext);

    let summaryHTML;
    if (cond_fm_regions && cond_fm_regions.length > 0) {
        const condRegions = cond_fm_regions.filter(region => region.type == 'conditional')
        const finemapping_methods : layout_types[] =
            Array.from( (cond_fm_regions || [])
                .filter(r => r.type == 'susie' || r.type == 'finemap')
                .reduce((acc,value) => {acc.add(value.type); return acc; } ,
                    new Set<layout_types>()))
        const [selectedMethod, setSelectedMethod] = useState<layout_types | undefined>(finemapping_methods.length > 0?finemapping_methods[0]:undefined);
        const n_cond_signals = condRegions.length > 0 ? condRegions[0].n_signals : 0;
        const [conditionalIndex, setConditionalIndex] = useState<number | undefined>(n_cond_signals > 0?0:undefined);

        useEffect(() => {
            console.log("finemapping.1");
            const params = dataSources?.sources?.finemapping?.params as Params ;
            console.log(`finemapping.1 ${dataSources} ${params?.allData} ${plot?.panels}`);

            if(plot?.panels && selectedMethod){
                const panel = plot.panels.finemapping
                panel.setTitle(`${selectedMethod} credible sets`)
            }

            if(dataSources && params?.allData && plot?.panels){
                console.log("finemapping.2");
                const index : number = params.allData.findIndex((cur, i) => cur.type == selectedMethod);
                params.dataIndex = index;
                const panel = plot.panels.finemapping
                panel.data_layers.associationpvalues.data = dataSources.sources.finemapping.parseArraysToObjects(params.allData[index].data, params.fields, params.outnames, params.trans)
                panel.data_layers.associationpvalues.render();
            }
        },[setSelectedMethod, selectedMethod, dataSources, plot]);

        useEffect(() => {
            const params = dataSources?.sources?.finemapping?.params as Params;
            if(dataSources && params?.allData && plot?.panels && conditionalIndex) {
                params.dataIndex = conditionalIndex;
                const panel = plot.panels.conditional;
                panel.setTitle('conditioned on ' + params.allData[conditionalIndex].conditioned_on);
                panel.data_layers.associationpvalues.data = dataSources.sources.conditional.parseArraysToObjects(params.allData[conditionalIndex].data, params.fields, params.outnames, params.trans);
                panel.data_layers.associationpvalues.render();
            }
        },[setConditionalIndex, conditionalIndex, dataSources, plot]);

        const showConditional = (i : number) => () => dataSources && plot && setConditionalIndex(i);
        const showFinemapping = (s : layout_types) => () => dataSources && plot &&  setSelectedMethod(s);

    const signalLabel = (region : CondFMRegions) => region.type == 'finemap' ?
            <Fragment><span>{region.n_signals} {region.type} signals (prob. {region.n_signals_prob.toFixed(3)} ) </span><br/></Fragment> :
            <Fragment><span>{region.n_signals} {region.type} signals</span><br/></Fragment>

    const conditionalLabel = (i : number) => <button onClick={showConditional(i)}
                                                          key={i}
                                                          data-cond-i={i}
                                                          disabled={ i === conditionalIndex }
                                                          className={"btn " + (i === conditionalIndex ? 'btn-default' : 'btn-primary' )}>
            <span>{i + 1}</span>
        </button>

        summaryHTML =
            <Fragment>
                { cond_fm_regions.map((region,i) => <div key={i}>{  signalLabel(region) }</div>)}

                {n_cond_signals > 0 ?
                    <Fragment>
                        <div className="row">
                            <div className="col-xs-12">
                                <p>
                                    <span>Conditional analysis results are approximations from summary stats. Conditioning is repeated until no signal p &lt; 1e-6 is left.</span>
                                </p>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-xs-12">
                                <p>
                                    <span>Show conditioned on { Array.from(Array(cond_fm_regions.length).keys()).map(i => conditionalLabel(i)) } variants<br/></span>
                                </p>
                            </div>
                        </div>
                    </Fragment> :
                    <Fragment/>
                }

                { (finemapping_methods.length > 0) ?
                    <Fragment>Show fine-mapping from </Fragment> : <Fragment/> }

                { finemapping_methods.map((r,i) =>
                        <button type="button" key={i} onClick={showFinemapping( r )}
                                className={"btn " + (r === selectedMethod ? 'btn-default' : 'btn-primary' )}
                                disabled={ r === selectedMethod }>
                            <span>{ r }</span>
                        </button>)
                }

            </Fragment>

    } else {
        summaryHTML = <Fragment/>
    }

    return summaryHTML;
}

export default RegionSelectFinemapping;