// import chipConfig from
// } from
import * as React from "react";
import { useMemo, useState } from "react";
import ReactDOMServer from "react-dom/server";
import { useParams, useLocation } from "react-router-dom";
import {
  useTable,
  useSortBy,
  useFilters,
  usePagination,
  TableOptions,
  Column,
  Row,
  CellProps,
  FilterTypes,
} from "react-table-chip";
import ReactTooltip from "react-tooltip";
import { useGetVariantResultsQuery } from "../api/apiSlice";
import { TableProps, VariantResult } from "../../types/types";
import {
  PhenoFilter,
  SearchFilter,
  VariantFilter,
  NumberFilter,
  SelectColumnFilter,
  INFOFilter,
  filterLessThan,
  filterAbsGreaterThan,
} from "./Filters";
import config from "../../chipConfig";

const typedConfig: { [key: string]: any } = config;

const pval_repr = (mlogp: number) => {
  const p = Math.pow(10, -mlogp);
  let repr = p.toExponential(2);
  // in case of underflow hack the string together
  if (p == 0) {
    const digits =
      Math.round(1000 * Math.pow(10, -(mlogp - Math.floor(mlogp)))) / 100;
    const exp = Math.ceil(mlogp);
    repr = `${digits}e-${exp}`;
  }
  return repr;
};

// https://github.com/TanStack/react-table/discussions/2022
const useSomeGuysFlexLayout = (hooks: any) => {
  const getRowStyles = (props: any) => [
    props,
    {
      style: {
        display: "flex",
      },
    },
  ];

  const getHeaderProps = (props: any, { column }: any) => [
    props,
    {
      style: {
        flex: column.width,
        minWidth: column.minWidth,
        cursor: column.disableSortBy ? "default" : "pointer",
        overflowX: "hidden",
      },
    },
  ];

  const getCellProps = (props: any, { cell }: any) => {
    return [
      props,
      {
        style: {
          flex: cell.column.width,
          minWidth: cell.column.minWidth,
          overflowX: "hidden",
        },
      },
    ];
  };

  hooks.getRowProps.push(getRowStyles);
  hooks.getHeaderGroupProps.push(getRowStyles);
  hooks.getHeaderProps.push(getHeaderProps);
  hooks.getCellProps.push(getCellProps);
};

export const ResultTable = () => {
  let params = useParams<TableProps>();

  const { pathname } = useLocation();
  const { data, isFetching, isSuccess, isError, error } = useGetVariantResultsQuery(params.query);
  const defaultColumn = React.useMemo(() => ({ Filter: PhenoFilter }), []);



  const naInfSort: any = (rowA: Row, rowB: Row, id: string, desc: boolean) => {
    let a = Number.parseFloat(rowA.values[id]);
    let b = Number.parseFloat(rowB.values[id]);
    if (
      typeof rowA.values[id] == "string" &&
      rowA.values[id].toLowerCase().startsWith("inf")
    ) {
      a = Number.POSITIVE_INFINITY;
    }
    if (Number.isNaN(a)) {
      // NA to bottom
      a = desc ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    }
    if (
      typeof rowB.values[id] == "string" &&
      rowB.values[id].toLowerCase().startsWith("inf")
    ) {
      b = Number.POSITIVE_INFINITY;
    }
    if (Number.isNaN(b)) {
      b = desc ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    }
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  };

  const columns: Column<VariantResult>[] = useMemo(
    () => [
      {
        Header: "phenotype",
        // @ts-ignore
        accessor: "pheno.name",
        filter: "phenoFilter",
        disableSortBy: true,
        Cell: (e: CellProps<VariantResult>) => {
          const arr =
            e.cell.row.original.beta_add < 0 ||
            (e.cell.row.original.beta_add == null &&
              e.cell.row.original.beta_chip < 0) ? (
              <span style={{ color: "blue" }}>&darr;</span>
            ) : e.cell.row.original.beta_add > 0 ||
              (e.cell.row.original.beta_add == null &&
                e.cell.row.original.beta_chip > 0) ? (
              <span style={{ color: "red" }}>&uarr;</span>
            ) : (
              <span style={{ visibility: "hidden" }}>&uarr;</span>
            );
          return (
            <span>
              {arr}
              <a
                target="_blank"
                href={`https://risteys.finngen.fi/phenocode/${e.cell.row.original.pheno.code}`}
              >
                {e.value}
              </a>
            </span>
          );
        },
        width: 5,
      },
      {
        Header: "gene",
        // @ts-ignore
        // TODO how to not ignore these
        accessor: "anno.gene_most_severe",
        disableSortBy: true,
        width: 1,
        Filter: SearchFilter,
      },
      {
        Header: "variant",
        accessor: "variant",
        disableSortBy: true,
        width: 2,
        Filter: VariantFilter,
        Cell: (e: CellProps<VariantResult>) => {
          if (e.cell.row.original.mlogp_chip) {
            return (
              <>
                <span
                  style={{ textDecoration: "underline dotted" }}
                  data-html={true}
                  data-tip={ReactDOMServer.renderToString(
                    <img
                      style={{ maxWidth: "100%", maxHeight: "100%" }}
                      id="cplot"
                      src={`/api/v1/cluster_plot/${e.value}`}
                    />
                  )}
                  data-for="tooltip-clusterplot"
                >
                  {e.value}
                </span>
              </>
            );
          } else {
            return (
              <span
                data-html={true}
                data-tip={ReactDOMServer.renderToString(
                  <span>
                    this variant is not on chip or has not passed chip QC
                  </span>
                )}
                data-for="tooltip-clusterplot"
              >
                {e.value}
              </span>
            );
          }
        },
      },
      {
        Header: "rsid",
        // @ts-ignore
        accessor: "anno.rsid",
        disableSortBy: true,
        width: 2,
        Filter: SearchFilter,
      },
      {
        Header: "consequence",
        // @ts-ignore
        accessor: "anno.most_severe",
        disableSortBy: true,
        width: 2,
        Filter: SelectColumnFilter,
        Cell: ({ value }: { value: string }) =>
          value.replace("_variant", "").replace(/_/g, " "),
      },
      {
        Header: "resources",
        // @ts-ignore
        accessor: "anno.chr", // an otherwise unused field needs to be used here
        width: 1,
        disableFilters: true,
        disableSortBy: true,
        Cell: (e: CellProps<VariantResult>) => (
          <>
            <a
              style={
                e.cell.row.original.mlogp_add != null
                  ? { paddingRight: "5px" }
                  : { paddingRight: "5px", visibility: "hidden" }
              }
              target="_blank"
              href={`https://results.finngen.fi/variant/${e.cell.row.original.variant}`}
            >
              fg
            </a>
            <a
              style={{ paddingRight: "5px" }}
              target="_blank"
              href={`https://gnomad.broadinstitute.org/variant/${e.cell.row.original.variant}?dataset=gnomad_r3`}
            >
              gn
            </a>
            <a
              target="_blank"
              href={`https://genetics.opentargets.org/variant/${e.cell.row.original.variant.replace(
                /-/g,
                "_"
              )}`}
            >
              ot
            </a>
          </>
        ),
      },
      {
        Header: "INFO",
        // @ts-ignore
        accessor: "anno.INFO",
        width: 1,
        disableSortBy: true,
        Filter: INFOFilter,
      },
      {
        Header: "MAF",
        // @ts-ignore
        accessor: "anno.AF",
        sortType: naInfSort,
        width: 1,
        Filter: NumberFilter,
        filter: filterLessThan,
        Cell: ({ value }: { value: number | string }) =>
          value == "NA"
            ? "NA"
            : value < 0.5
            ? Number(value).toExponential(2)
            : (1 - Number(value)).toExponential(2),
      },
      {
        Header: "FIN enr.",
        // @ts-ignore
        accessor: "anno.enrichment",
        sortType: naInfSort,
        width: 1,
        Filter: NumberFilter,
        filter: filterAbsGreaterThan,
        Cell: ({ value }: { value: number | string }) =>
          value == "NA" || value == "inf"
            ? value
            : Number(value).toPrecision(3),
      },
      {
        Header: "p-val",
        accessor: "mlogp_add",
        sortType: naInfSort,
        width: 1,
        Filter: NumberFilter,
        filter: filterAbsGreaterThan,
        Cell: ({ value }) => {
          const repr = pval_repr(value);
          return (
            <span
              style={
                value == null || Math.pow(10, -value) > 5e-8
                  ? { color: "#777777" }
                  : {}
              }
            >
              {value == null ? "NA" : repr}
            </span>
          );
        },
      },
      {
        Header: "p-val rec",
        accessor: "mlogp_rec",
        sortType: naInfSort,
        width: 1,
        Filter: NumberFilter,
        filter: filterAbsGreaterThan,
        Cell: ({ value }) => {
          const p = Math.pow(10, -value);
          let repr = p.toExponential(2);
          // in case of underflow hack the string together
          if (p == 0) {
            const digits =
              Math.round(1000 * Math.pow(10, -(value - Math.floor(value)))) /
              100;
            const exp = Math.ceil(value);
            repr = `${digits}e-${exp}`;
          }
          return (
            <span style={value == null || p > 5e-8 ? { color: "#777777" } : {}}>
              {value == null ? "NA" : repr}
            </span>
          );
        },
      },
      {
        Header: "p-val chip",
        accessor: "mlogp_chip",
        sortType: naInfSort,
        width: 1,
        Filter: NumberFilter,
        filter: filterAbsGreaterThan,
        Cell: ({ value }) => {
          const p = Math.pow(10, -value);
          let repr = p.toExponential(2);
          // in case of underflow hack the string together
          if (p == 0) {
            const digits =
              Math.round(1000 * Math.pow(10, -(value - Math.floor(value)))) /
              100;
            const exp = Math.ceil(value);
            repr = `${digits}e-${exp}`;
          }
          return (
            <span style={value == null || p > 5e-8 ? { color: "#777777" } : {}}>
              {value == null ? "NA" : repr}
            </span>
          );
        },
      },
      {
        Header: "beta",
        accessor: "beta_add",
        sortType: naInfSort,
        width: 1,
        Filter: NumberFilter,
        filter: filterAbsGreaterThan,
        Cell: (e: CellProps<VariantResult>) => (
          <span
            style={
              e.cell.row.original.mlogp_add == null ||
              Math.pow(10, -e.cell.row.original.mlogp_add) > 5e-8
                ? { color: "#777777" }
                : {}
            }
          >
            {e.value == null ? "NA" : e.value.toPrecision(3)}
          </span>
        ),
      },
      {
        Header: "beta rec",
        accessor: "beta_rec",
        sortType: naInfSort,
        width: 1,
        Filter: NumberFilter,
        filter: filterAbsGreaterThan,
        Cell: (e: CellProps<VariantResult>) => (
          <span
            style={
              e.cell.row.original.mlogp_rec == null ||
              Math.pow(10, -e.cell.row.original.mlogp_rec) > 5e-8
                ? { color: "#777777" }
                : {}
            }
          >
            {e.value == null ? "NA" : e.value.toPrecision(3)}
          </span>
        ),
      },
      {
        Header: "beta chip",
        accessor: "beta_chip",
        sortType: naInfSort,
        width: 1,
        Filter: NumberFilter,
        filter: filterAbsGreaterThan,
        Cell: (e: CellProps<VariantResult>) => (
          <span
            style={
              e.cell.row.original.mlogp_chip == null ||
              Math.pow(10, -e.cell.row.original.mlogp_chip) > 5e-8
                ? { color: "#777777" }
                : {}
            }
          >
            {e.value == null ? "NA" : e.value.toPrecision(3)}
          </span>
        ),
      },
      {
        Header: "rec-add",
        accessor: "rec_add",
        sortType: naInfSort,
        width: 1,
        Filter: NumberFilter,
        filter: filterAbsGreaterThan,
        Cell: (e: CellProps<VariantResult>) => (
          <span>{e.value == null ? "NA" : e.value.toPrecision(3)}</span>
        ),
      },
      {
        Header: "leads",
        accessor: "possible_explaining_signals",
        width: 1,
        disableFilters: true,
        disableSortBy: true,
        Cell: (e: CellProps<VariantResult>) => {
          //adding tooltip here unlike the other tooltips
          //because otherwise pagination and filtering break the tip
          let tt = null;
          let maxDiff = 0; // if the non-coding association is much stronger, warn about it
          if (e.value != null) {
            const rows = e.value.split(";").map((row: string) => {
              const cols = row.split(",");
              cols[0] = cols[0]
                .split(":")
                .map((f, i) => {
                  return i == 0 && f == "23" ? "X" : f;
                })
                .join("-");
              const compare =
                e.row.original.mlogp_add == null
                  ? e.row.original.mlogp_chip
                  : e.row.original.mlogp_add;
              if (Number(cols[1]) - compare > maxDiff) {
                maxDiff = Number(cols[1]) - compare;
              }
              return `<tr>
              <td><a style="color: white;" target="_blank" href="https://results.finngen.fi/variant/${
                cols[0]
              }">${cols[0]}</a></td>
              <td style="padding-left: 10px">${pval_repr(
                Number(cols[1])
              )}</td><td style="padding-left: 10px">${
                cols[2] == "NA" ? cols[2] : Number(cols[2]).toPrecision(3)
              }</td>
              </tr>`;
            });
            tt = `<div>
                  <span>in this region there are variants that are <br/>stronger than the coding variant<br/>and may explain the association:</span>
                  <table class="tooltiptable">
                  <thead>
                  <tr>
                  <th>lead variant</th>
                  <th style="padding-left: 10px">p-val</th>
                  <th style="padding-left: 10px">LD r2 to coding</th>
                  </tr>
                  </thead>
                  <tbody>
                  ${rows.join("")}
                  </tbody>
                  <table>
                  </div>`;
          }
          return (
            <>
              <ReactTooltip
                id="tooltip-lead"
                place="left"
                arrowColor="transparent"
                html={true}
                effect="solid"
                event="click"
              />
              <span
                style={{
                  color:
                    maxDiff > 2
                      ? "#aa0000"
                      : maxDiff > 0
                      ? "#aaaa00"
                      : "#000000",
                }}
                data-tip={tt}
                data-for="tooltip-lead"
              >
                {e.value == null ? "NA" : "click"}
              </span>
            </>
          );
        },
      },
    ],
    []
  );

  const filterTypes: FilterTypes<VariantResult> = React.useMemo(
    () => ({
      phenoFilter: (
        rows: Array<Row<VariantResult>>,
        id: Array<string>,
        filterValue: { onlyTop: boolean; filterText: string }
      ) => {
        if (filterValue.onlyTop) {
          return rows.filter((row) => {
            return row.original.is_top_pheno;
          });
        }
        return rows.filter((row) => {
          // @ts-ignore
          const rowValue = row.values[id];
          return rowValue !== undefined
            ? String(rowValue)
                .toLowerCase()
                .indexOf(String(filterValue.filterText).toLowerCase()) > -1
            : true;
        });
      },
    }),
    []
  );

  const opts: TableOptions<VariantResult> = {
    // https://github.com/TanStack/react-table/issues/2369
    autoResetSortBy: false,
    autoResetPage: false,
    autoResetExpanded: false,
    autoResetFilters: false,
    data: isSuccess ? data!.results : [],
    columns,
    defaultColumn,
    filterTypes,
    initialState: {
      sortBy: [
        {
          id: "mlogp_add",
          desc: true,
        },
      ],
      pageSize: 30,
    },
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    rows,
    gotoPage,
    nextPage,
    previousPage,
    state: { pageIndex },
  } = useTable(
    opts,
    useSomeGuysFlexLayout,
    useFilters,
    useSortBy,
    usePagination
  );

  if (pathname.startsWith("/results") && !params.query) {
    return <div>no variant or gene</div>;
  } else if (isFetching) {
    return (
      <div className="loading" style={{ height: "100%" }}>
        loading...
      </div>
    );
  } else if (isError) {
    if(error.status == 404) {
      return <div style={{ height: "100%" }}>Not Found</div>;
    } else if ("data" in error!) {
      return <div style={{ height: "100%" }}>{error.status}</div>;
    }
    return <div style={{ height: "100%" }}>{error}</div>;
  } else if (isSuccess) {
    return (
      <>
        {params.query ? (
          <div style={{ paddingTop: "10px", paddingBottom: "10px" }}>
            {params.query.toUpperCase()}: associations for{" "}
            {Object.keys(data.anno).length} coding variants
          </div>
        ) : (
          <div style={{ paddingTop: "10px", paddingBottom: "10px" }}>
            TOP RESULTS: all coding variant associations with p-value &lt; 1e-5
            (excluding HLA and APOE)
          </div>
        )}
        <ReactTooltip
          id="tooltip-clusterplot"
          place="right"
          arrowColor="transparent"
          html={true}
        />
        <ReactTooltip
          id="tooltip-header"
          place="right"
          arrowColor="transparent"
          html={true}
        />
        <table className="maintable" {...getTableProps()}>
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    // disable "unsorted" behavior, only toggle sort on allowed columns
                    onClick={() =>
                      !column.disableSortBy &&
                      column.toggleSortBy(!column.isSortedDesc)
                    }
                  >
                    <span
                      data-tip={typedConfig.tip[column.Header!.toString()]}
                      data-for="tooltip-header"
                    >
                      {column.render("Header")}
                      {column.isSorted ? (
                        column.isSortedDesc ? (
                          <span>&#9660;</span>
                        ) : (
                          <span>&#9650;</span>
                        )
                      ) : (
                        ""
                      )}
                    </span>
                    <div
                      onClick={(e) => {
                        e.stopPropagation(); // prevent sort on filter click
                      }}
                    >
                      {column.canFilter ? column.render("Filter") : null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {page.map((row) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map((cell) => {
                    return (
                      <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="pagination">
          <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
            {"<<"}
          </button>{" "}
          <button onClick={() => previousPage()} disabled={!canPreviousPage}>
            {"<"}
          </button>{" "}
          <button onClick={() => nextPage()} disabled={!canNextPage}>
            {">"}
          </button>{" "}
          <button
            onClick={() => gotoPage(pageCount - 1)}
            disabled={!canNextPage}
          >
            {">>"}
          </button>{" "}
          <span>
            page {pageIndex + 1} of {pageOptions.length} ({rows.length} rows)
          </span>
        </div>
      </>
    );
  }
  return (
    <div className="loading" style={{ height: "100%" }}>
      this should not happen...
    </div>
  );
};
