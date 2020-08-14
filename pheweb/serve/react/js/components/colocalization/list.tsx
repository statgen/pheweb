import React, { useState, useEffect , useContext } from 'react';
import ReactTable, { Cell } from 'react-table';
import { ColocalizationContext, ColocalizationState } from '../../contexts/colocalization/ColocalizationContext';
import { CSVLink } from 'react-csv'
import { Colocalization } from './model'
import { LocusZoomContext } from '../region/locus';
import { Panel } from 'locuszoom';

interface Props { locusZoomContext? : LocusZoomContext }

const reformat = (locus : string) : string | undefined => {                                                                                                                                                                            
  var regexp = /^chr([^_]+)_([\d]+)_([^_]+)_([^_]+)$/;                                                                                                                                                     
  var match = locus.match(regexp);                                                                                                                                                                         
  let result : string | undefined;                                                                                                                                                                                              
  if(match){                                                                                                                                                                                               
    const [chromosome,position,reference,alternative] = match.slice(1);                                                                                                                                    
    result = `${chromosome}:${position}_${reference}/${alternative}`;                                                                                                                                      
  } else {                                                                                                                                                                                                 
    result = undefined;                                                                                                                                                                                    
  }                                                                                                                                                                                                        
  return result;
}
  
const updateLocusZoom = (locusZoomContext : LocusZoomContext,selected : Array<Colocalization>) => {
    const { dataSources , plot } = locusZoomContext;
    const params = dataSources.get("finemapping").params
    const panel : Panel = plot.panels.finemapping
    const title: string = (selected.length == 0)?"Credible Set":"Credible Set : Colocalization"
    panel.setTitle(title)

    // there are two data tracks will focus on the first one for now
    var data = dataSources.sources.finemapping.parseArraysToObjects(params.allData[0].data, params.fields, params.outnames, params.trans)
    if(selected.length > 0){
      const locus : Array<string> = selected.map(c => c.locus_id1).map(reformat).filter(l => l)
      data = data.filter(d => locus.includes(d["finemapping:id"]))
    }

    panel.data_layers.associationpvalues.data = data
    panel.data_layers.associationpvalues.render()
  }


const List = (props : Props) => {
    const parameter = useContext<Partial<ColocalizationState>>(ColocalizationContext).parameter;
    const [selectedRow, setSelectedRow]= useState<Set<number>>(new Set());
    const context : LocusZoomContext = props.locusZoomContext
    useEffect( () => { getList(); }, [parameter]); /* only update on when position is updated */
    
    const [colocalizationList, setList] = useState<Array<Colocalization> | undefined>(undefined); /* set up hooks for colocalization */

    const getList = () => {
        if(parameter != null && parameter.phenotype != null && parameter.locus != null){
	    const url = `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}?clpa.gte=0.1&clpa.order=desc`;
	    fetch(url).then(response => response.json()).then((d) => { setList(d.colocalizations); } ).catch(function(error){ alert(error);});
        }
    }

    if(parameter == null) {
        return  (<div />);
    } else if(colocalizationList != null){
	const metadata = [ { title: "source" , accessor: "source2" , label:"Source" },
                     { title: "locus id", accessor: "locus_id1" , label:"Locus ID" },
                     { title: "qlt code", accessor: "phenotype2", label: "QTL Code" },
                     { title: "qlt", accessor: "phenotype2_description", label: "QTL" },
                     { title: "tissue", accessor: "tissue2",
                       Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.replace(/_/g,' '),
			                 label: "Tissue" },
                     { title: "clpp", accessor: "clpp",
                       Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
			                 label: "CLPP" },
                     { title: "clpa", accessor: "clpa" ,
                       Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
                       label: "CLPA" }];

  const columns = metadata.map(c => ({ ...c , Header: () => (<span title={ c.title} style={{textDecoration: 'underline'}}>{ c.label }</span>) }))
  const headers = columns.map(c => ({ ...c , key: c.accessor }))

  const getTrProps = (row, setRow) => (state, rowInfo?, column, instance?) => { 
  if(rowInfo && rowInfo.row){
    const index : number = rowInfo.index; 
    const onClick = () => {
          if(row.has(index)){
            row.delete(index);
            setRow(row);
          } else {
            setRow(row.add(index));
          }
	if(colocalizationList && context){
  }
  if(instance){ instance.forceUpdate(); }
  updateLocusZoom(context, Array.from<number>(row).map((i : number) => colocalizationList[i]))
    };
    const style : { background : string , color : string } = { background: "#0aafec" , color : "white" }
    const result : { onClick : () => void ,
                     style? : { background : string , color : string } } = row.has(rowInfo.index)?{ onClick , style }:{ onClick };
    return result;
} else { return {}; }
}

return (<div>
		<ReactTable data={ colocalizationList }
                       columns={ columns }
                       defaultSorted={[{  id: "clpa", desc: true }]}
                       defaultPageSize={10}
                       filterable
                       defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase())}
                       getTrProps={getTrProps(selectedRow, setSelectedRow)}
		            className="-striped -highlight"/>
		<p></p>
		<div className="row">
		   <div className="col-xs-12">
	              <CSVLink 
		               headers={headers}
		               data={ colocalizationList }
		               separator={'\t'}
		               enclosingCharacter={''}
		               filename={`colocalization.tsv`}
		               className="btn btn-primary"
		               target="_blank">Download Table
		      </CSVLink>
		   </div>

		</div>
		</div>);
    } else { return (<div>Loading ... </div>); }
}


export default List
