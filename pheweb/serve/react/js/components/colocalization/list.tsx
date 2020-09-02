import React, { useState, useEffect , useContext } from 'react';
import ReactTable, { Cell } from 'react-table';
import { ColocalizationContext, ColocalizationState, Locus } from '../../contexts/colocalization/ColocalizationContext';
import { CSVLink } from 'react-csv'
import { Colocalization , CasualVariant, LocusZoomData, EMPTY } from './model'
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

const updateLocusZoom = (locusZoomData : LocusZoomData | undefined,context : LocusZoomContext,colocalization : Colocalization | undefined) => {
    const { dataSources ,  plot } = context;
    const title: string = colocalization?`Credible Set : ${colocalization.phenotype1}`:"Credible Set : Colocalization"
    const panel : Panel = plot.panels.colocalization
    panel.setTitle(title)

    const dataSource = dataSources.sources.colocalization;
    const params : { [key: string ]: any; } = dataSource.params;
    const doLookup : boolean = colocalization && locusZoomData && colocalization.id in locusZoomData;
    const data = doLookup?locusZoomData[colocalization.id]:EMPTY;
    panel.data_layers.colocalization.data = dataSource.parseArraysToObjects(data,
                                                                            params.fields,
                                                                            params.outnames,
                                                                            params.trans);
    panel.data_layers.colocalization.render();
  }

const subComponent = (colocalizationList) => (row) => {
    const metadata = [ { title: "id" , accessor: "id" , label:"Id" },
		       { title: "pip1" , accessor: "pip1" , label:"PIP 1" },
		       { title: "pip2" , accessor: "pip2" , label:"PIP 2" },
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
    const context : LocusZoomContext = props.locusZoomContext

    const [selectedRow, setRowSelected]= useState<string | undefined>(undefined);
    const [colocalizationList, setList] = useState<Array<Colocalization> | undefined>(undefined); /* set up hooks for colocalization */
    const [locusZoomData, setLocusZoomData] = useState<LocusZoomData | undefined>(undefined); /* set up hooks for colocalization */

    useEffect( () => { getList(); 
                       getLocusZoomData(); }, [parameter]); /* only update on when position is updated */



    const toggleSelection = (key, shift, row : Colocalization) => { 
      setRowSelected(selectedRow ? undefined : key);
      updateLocusZoom(locusZoomData,context,selectedRow ? undefined : row);
    }
    const isSelected = (key) =>  selectedRow === `select-${key}`;
  
    const rowFn = (state, rowInfo, column, instance) => {
      return {
        onClick: (e, handleOriginal) => handleOriginal && handleOriginal(),
        style: {
          background:
            rowInfo &&
            selectedRow === `select-${rowInfo.original.id}` &&
            "lightgrey"
        }
      };
    };
     
    const getList = () => {
        if(parameter != null && parameter.phenotype != null && parameter.locus != null){
	    const url = `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}?clpa.gte=0.1&clpa.order=desc`;
	    fetch(url).then(response => response.json()).then((d) => { setList(d.colocalizations); } ).catch(function(error){ alert(error);});
        }
    }


    const getLocusZoomData = () => {
      if(parameter != null && parameter.phenotype != null && parameter.locus != null){
        const phenotype : string = parameter.phenotype;
        const locus : Locus = parameter.locus;
        const url = `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}/finemapping`;
        fetch(url).then(response => response.json()).then((d) => { setLocusZoomData(d); } ).catch(function(error){ alert(error);});
          }
        
    }

    if(parameter == null || locusZoomData === undefined) {
        return  (<div />);
    } else if(colocalizationList != null){
	const metadata = [ { title: "source" , accessor: "source2" , label:"Source" },
			   { title: "locus id", accessor: "locus_id1" , label:"Locus ID" },
			   { title: "code", accessor: "phenotype2", label: "Code" },
			   { title: "description", accessor: "phenotype2_description", label: "Description" },
			   { title: "tissue", accessor: "tissue2",
			     Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.replace(/_/g,' '),
			     label: "Tissue" },
			   { title: "clpp", accessor: "clpp",
			     Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
			     label: "CLPP" },
			   { title: "clpa", accessor: "clpa" ,
			     Cell: (props : Cell) => (props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2),
			     label: "CLPA" },
         { title: "cs_size_1", accessor: "cs_size_1", label: "CS Size 1" },
         { title: "cs_size_2", accessor: "cs_size_2", label: "CS Size 2" }
        
        ];

  const columns = metadata.map(c => ({ ...c , Header: () => (<span title={ c.title} style={{textDecoration: 'underline'}}>{ c.label }</span>) }))
  const headers = columns.map(c => ({ ...c , key: c.accessor }))

  return (<div>
    <SelectTable data={ colocalizationList }
                 keyField="id" 
                 columns={ columns }
                 defaultSorted={[{  id: "clpa", desc: true }]}
                 defaultPageSize={10}
                 filterable
                 defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase())}
                 SubComponent={ subComponent(colocalizationList) }
                 toggleSelection={toggleSelection}
                 selectType="radio"
                 isSelected={isSelected}
                 getTrProps={rowFn}
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
