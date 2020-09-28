import React, { useState, useEffect , useContext } from 'react';
import {CasualVariant, Colocalization, Variant, variantFromStr, variantToStr} from "../../../common/Model";
import ReactTable, {Cell, Row} from 'react-table';
import {ColocalizationContext, ColocalizationState} from "./ColocalizationContext";
import selectTableHOC from "react-table/lib/hoc/selectTable";
import { CSVLink } from 'react-csv'
import {cell_number, cell_text, variant_link} from "../../../common/Formatter";
import {compose} from "../../../common/Utilities";
const SelectTable = selectTableHOC(ReactTable);
SelectTable.prototype.headSelector = () => null;

export const cell_locus_id1 = (row : Row<Colocalization>) => row.original.locus_id1
export const cell_variant1 = (row : Row<CasualVariant>) => row.original.variant1

const listMetadata = [ { title: "source" , accessor: "source2" , label:"Source", flexBasis: "max-content" },
                       { title: "locus id", accessor: "locus_id1" , label:"Locus ID",
                         Cell: compose(cell_locus_id1,variant_link) },
                       { title: "code", accessor: "phenotype2", label: "Code" },
                       { title: "description", accessor: "phenotype2_description", label: "Description" },
                       { title: "tissue", accessor: "tissue2",
                         Cell: cell_text,
                         label: "Tissue" },
                       { title: "clpp", accessor: "clpp",
                         Cell: cell_number,
                         label: "CLPP",
                         width: 80 },
                       { title: "clpa", accessor: "clpa" ,
                         Cell: cell_number,
                         label: "CLPA",
                         width: 80 },
                       { title: "cs_size_1", accessor: "cs_size_1", label: "CS Size 1", width: 80 },
                       { title: "cs_size_2", accessor: "cs_size_2", label: "CS Size 2", width: 80 } ];

const subComponentMetadata = [ { title: "Variant 1" , accessor: "varid1" , label: "Variant 1" , Cell : compose(cell_variant1,variant_link) },
                               { title: "pip1" , accessor: "pip1" , label:"PIP 1" },
                               { title: "beta1" , accessor: "beta1" , label:"Beta 1" },
                               { title: "pip2" , accessor: "pip2" , label:"PIP 2" },
                               { title: "beta2" , accessor: "beta2" , label:"Beta 2" },
                               { title: "count_label" , accessor: "count_label" , label:"Label" }]

const columns = (metadata) => metadata.map(c => ({ ...c , Header: () => (<span title={ c.title} style={{textDecoration: 'underline'}}>{ c.label }</span>) }))
const headers = (metadata) => columns(metadata).map(c => ({ ...c , key: c.accessor }))

const subComponent = (colocalizationList) => (row : Row<Colocalization>) => {
    const colocalization : Colocalization = row.original;
    const causalvariant : CasualVariant[] = colocalization.variants;
    return (<div style={{ padding: "20px" }}>
        <ReactTable
            data={ causalvariant }
            columns={ columns(subComponentMetadata) }
            defaultPageSize={5}
            showPagination={true} />
    </div>);
}

interface Props {}
const List = (props : Props) => {
    const { locusZoomData, colocalization , selectedRow, setRowSelected } = useContext<Partial<ColocalizationState>>(ColocalizationContext);

    const toggleSelection = (key, shift, row : Colocalization) =>
        setRowSelected && setRowSelected(selectedRow ? undefined : key);
    const isSelected = (key) =>  selectedRow === `select-${key}`;

    const rowFn = (state, rowInfo, column, instance) => {
        return { onClick: (e, handleOriginal) => handleOriginal && handleOriginal(),
                 style: { background: rowInfo && selectedRow === `select-${rowInfo.original.id}` && "lightgrey" }
        };
    };

    if(colocalization && locusZoomData){
        return (<div>
            <SelectTable data={ colocalization }
                         keyField="id"
                         columns={ columns(listMetadata) }
                         defaultSorted={[{  id: "clpa", desc: true }]}
                         defaultPageSize={10}
                         filterable
                         defaultFilterMethod={(filter, row) => row[filter.id].toLowerCase().startsWith(filter.value.toLowerCase())}
                         SubComponent={ subComponent(colocalization) }
                         toggleSelection={toggleSelection}
                         selectType="radio"
                         isSelected={isSelected}
                         getTrProps={rowFn}
                         className="-striped -highlight"
                         useFlexLayout />
            <p></p>
            <div className="row">
                <div className="col-xs-12">
                    <CSVLink
                        headers={headers(listMetadata)}
                        data={ colocalization }
                        separator={'\t'}
                        enclosingCharacter={''}
                        filename={`colocalization.tsv`}
                        className="btn btn-primary"
                        target="_blank">Download Table
                    </CSVLink>
                </div>

            </div>
        </div>);
    } else {
        return (<div>Loading ... </div>);
    }
}
export default List