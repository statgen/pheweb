import React, { useState, useEffect , useContext } from 'react';
import ReactTable, { Cell } from 'react-table';
import { ColocalizationContext , ColocalizationState } from '../region/ColocalizationContext';
import { CSVLink } from 'react-csv'
import { cell_text , cell_number } from '../common/formatter'

interface Props {}

const metadata = [ { title: "source" , accessor: "source2" , label:"Source" },
                   { title: "locus id", accessor: "locus_id1" , label:"Locus ID" },
                   { title: "qlt code", accessor: "phenotype2", label: "QTL Code" },
                   { title: "qlt", accessor: "phenotype2_description", label: "QTL" },
                   { title: "tissue", accessor: "tissue2", Cell: cell_text, label: "Tissue" },
                   { title: "clpp", accessor: "clpp", Cell: cell_number, label: "CLPP" },
                   { title: "clpa", accessor: "clpa" , Cell: cell_number, label: "CLPA" }];

const columns = metadata.map(c => ({ ...c , Header: () => (<span title={ c.title} style={{textDecoration: 'underline'}}>{ c.label }</span>) }))
const headers = columns.map(c => ({ ...c , key: c.accessor }))
           
const ColocalizationList = (props : Props) => {
    const parameter = useContext<Partial<ColocalizationState>>(ColocalizationContext).parameter;
    useEffect( () => {
        getColocalizationList();
    }, [parameter]); /* only update on when position is updated */

    const [colocalizationList, setColocalizationList] = useState(null); /* set up hooks for colocalization */

    const getColocalizationList = () => {
        if(parameter){
	      const url = `/api/colocalization/${parameter.phenotype}/${parameter.locus.chromosome}:${parameter.locus.start}-${parameter.locus.stop}`;
        fetch(url).then(response => response.json()).then((d) => { setColocalizationList(d.data.colocalizations); console.log(d.data); } ).catch(function(error){ alert(error);});
        }
    }

    if(parameter == null) {
        return  (<div />);
    } else if(colocalizationList != null){

        return (<div>
		<ReactTable data={ colocalizationList }
                columns={ columns }
                defaultSorted={[{  id: "clpa", desc: true }]}
                defaultPageSize={10}
                filterable={true}
		            defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase())}
		            className="-striped -highlight"/>
		<p></p>
		<div className="row">
		   <div className="col-xs-12">
		      <CSVLink headers={headers}
		               data={ colocalizationList }
		               separator={'\t'}
		               enclosingCharacter={''}
		               filename={`colocatoin.tsv`}
		               className="btn btn-primary"
		               target="_blank">Download Table
		      </CSVLink>
		   </div>

		</div>
		</div>);
    } else { return (<div>Loading ... </div>); }
}

export default ColocalizationList
