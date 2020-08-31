import React, { useState, useEffect , useContext } from 'react';
import ReactTable, { Cell } from 'react-table';
import { ColocalizationContext, ColocalizationState } from '../../contexts/colocalization/ColocalizationContext';
import { CSVLink } from 'react-csv'
import { Colocalization , CasualVariant } from './model'
import { LocusZoomContext } from '../region/locus';
import { Panel, DataLayer, Plot } from 'locuszoom';
import selectTableHOC from "react-table/lib/hoc/selectTable";
import "react-table/react-table.css";

interface Props { locusZoomContext? : LocusZoomContext }

const SelectTable = selectTableHOC(ReactTable);
// remove the select all button
SelectTable.prototype.headSelector = () => null;
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

const credible_set = (spec : string) : string[] => spec.split(',').map(reformat).filter(l => l)

const label = (variant_label : string,variants : Array<CasualVariant>) : CasualVariant[] => variants.map((v) => { return { ... v, variant_label } })

const updateLocusZoom = (locusZoomContext : LocusZoomContext,selectedRow : Map<number,Colocalization>) => {
    const { plot } : { plot : Plot }= locusZoomContext;
    const selectedRowSize = selectedRow.size
    const title: string = (selectedRowSize == 0)?"Credible Set : Colocalization":`Credible Set : Colocalization : ${selectedRowSize}`
    const panel : Panel = plot.panels.colocalization
    panel.setTitle(title)

    const data_layer : DataLayer = panel.data_layers.colocalization;

    const variants : CasualVariant [] = Array.
                                         from(selectedRow.values()).
                                         reduce<CasualVariant []>((acc,value) => (acc.concat(label('variant 1',value.variants_1),
                                                                                             label('variant 2',value.variants_2))),
                                                                                   new Array());
    const ids : string [] = variants.map(v => v.id);
    if(ids.length == 0){
      data_layer.unhideAllElements();
    } else {                                      
      data_layer.hideAllElements();
      variants.forEach(v => data_layer.unhideElement(`${v.variation_chromosome}${v.position}_${v.variation_ref}${v.variation_alt}`))
    }
    data_layer.render();

  }

const subComponent = (colocalizationList) => (row) => {
    const metadata = [ { title: "id" , accessor: "id" , label:"Id" },
		       { title: "pip1" , accessor: "pip1" , label:"Pip 1" },
		       { title: "pip2" , accessor: "pip2" , label:"Pip 2" },
		       { title: "beta1" , accessor: "beta1" , label:"Beta 1" },
           { title: "beta2" , accessor: "beta2" , label:"Beta 2" },
           { title: "variant_label" , accessor: "variant_label" , label:"Label" }]
    const columns = metadata.map(c => ({ ...c , Header: () => (<span title={ c.title} style={{textDecoration: 'underline'}}>{ c.label }</span>) }))
    const colocalization : Colocalization = colocalizationList[row.index]
    const data = [... label('variant 1', colocalization.variants_1),
                  ... label('variant 2', colocalization.variants_2)] // TODO : add variant columns
    return (<div style={{ padding: "20px" }}>
	      <ReactTable
                  data={ data }
                  columns={ columns }
                  defaultPageSize={5}
                  showPagination={true} />
	    </div>);
}

const List = (props : Props) => {
    const parameter = useContext<Partial<ColocalizationState>>(ColocalizationContext).parameter;
    const [selectedRow, setRowSelected]= useState<Map<number,Colocalization>>(new Map<number,Colocalization>());
   
    const context : LocusZoomContext = props.locusZoomContext
    const [colocalizationList, setList] = useState<Array<Colocalization> | undefined>(undefined); /* set up hooks for colocalization */

    useEffect( () => { getList(); }, [parameter]); /* only update on when position is updated */

    
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
			     label: "CLPA" },
			   { title: "cs_size", accessor: "cs_size", label: "CS Size" } ];

  const columns = metadata.map(c => ({ ...c , Header: () => (<span title={ c.title} style={{textDecoration: 'underline'}}>{ c.label }</span>) }))
  const headers = columns.map(c => ({ ...c , key: c.accessor }))

  const toggleSelection = (key : string, shift : boolean, row : Colocalization) => {
      if(selectedRow && setRowSelected && row){
	      const id : number = row.id;
  	    if(selectedRow.has(id)){
          selectedRow.delete(id);
	      } else {
          selectedRow.set(id, row);
	      }
        setRowSelected(selectedRow);
	      context && selectedRow && updateLocusZoom(context, selectedRow);
      }
  }
	
  const isSelected = (key : number) => { }

  return (<div>
    <SelectTable data={ colocalizationList }
                 keyField="id" 
                 columns={ columns }
                 defaultSorted={[{  id: "clpa", desc: true }]}
                 defaultPageSize={10}
                 filterable
	               selectType="checkbox"
                 defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase())}
                 SubComponent={ subComponent(colocalizationList) }
	               toggleSelection={ toggleSelection }
	               isSelected={ isSelected }
	               className="-striped -highlight" />
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
