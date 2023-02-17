import * as React from "react";
import { FilterProps, Row, IdType, FilterValue } from "react-table";

export const PhenoFilter = ({
  column: { filterValue, preFilteredRows, setFilter },
}: FilterProps<any>) => {
  const [checked, setChecked] = React.useState(
    filterValue && filterValue.onlyTop
  );
  const count = Object.keys(
    preFilteredRows.reduce((acc, cur) => {
      acc[cur.values["pheno.name"]] = true;
      return acc;
    }, {} as Record<string, boolean>)
  ).length;
  return (
    <>
      <div>
        <input
          value={
            filterValue && filterValue.filterText ? filterValue.filterText : ""
          }
          onChange={(e) => {
            setFilter(
              e.target.value
                ? { onlyTop: false, filterText: e.target.value }
                : undefined
            );
          }}
          placeholder={`search ${count} phenotypes`}
          style={{ width: "90%" }}
        />
      </div>
      <div>
        <input
          type="checkbox"
          name="onlyTopPerVariant"
          checked={checked}
          onChange={(e) => {
            if (e.target.checked) {
              setFilter({
                onlyTop: true,
                filterText: (filterValue && filterValue.filterText) || "",
              });
            } else {
              setFilter({
                onlyTop: false,
                filterText: (filterValue && filterValue.filterText) || "",
              });
            }
            setChecked(!checked);
          }}
        />
        <span style={{ fontWeight: 400 }}>only top phenotype per variant</span>
      </div>
    </>
  );
};

export const SearchFilter = ({
  column: { filterValue, setFilter },
}: FilterProps<any>) => (
  <input
    value={filterValue || ""}
    onChange={(e) => {
      setFilter(e.target.value || undefined); // Set undefined to remove the filter entirely
    }}
    // @ts-ignore
    placeholder={`search`}
    style={{ width: "90%" }}
  />
);

export const VariantFilter = ({
  column: { filterValue, preFilteredRows, setFilter },
}: FilterProps<any>) => {
  const count = Object.keys(
    preFilteredRows.reduce((acc, cur) => {
      acc[cur.values["variant"]] = true;
      return acc;
    }, {} as Record<string, boolean>)
  ).length;
  return (
    <input
      value={filterValue || ""}
      onChange={(e) => {
        setFilter(e.target.value || undefined);
      }}
      placeholder={`search ${count} variants`}
      style={{ width: "90%" }}
    />
  );
};

export const INFOFilter = ({
  column: { filterValue, setFilter },
}: FilterProps<any>) => {
  const [checked, setChecked] = React.useState(filterValue == "NA");
  return (
    <>
      <input
        type="checkbox"
        name="showImputed"
        checked={checked}
        onChange={(e) => {
          if (e.target.checked) {
            setFilter("NA");
          } else {
            setFilter(undefined);
          }
          setChecked(!checked);
        }}
      />
      <span style={{ fontWeight: 400 }}>only chip</span>
    </>
  );
};

export const SelectColumnFilter = ({
  column: { filterValue, setFilter, preFilteredRows, id },
}: FilterProps<any>) => {
  const options = React.useMemo(() => {
    const options = new Set();
    preFilteredRows.forEach((row) => {
      options.add(row.values[id]);
    });
    return Array.from(options) as Array<string>;
  }, [id, preFilteredRows]);

  return (
    <select
      style={{ width: "90%" }}
      value={filterValue}
      onChange={(e) => {
        setFilter(e.target.value || undefined);
      }}
    >
      <option value="">all</option>
      {options.map((option, i) => (
        <option key={i} value={option}>
          {option.replace("_variant", "").replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
};

export const NumberFilter = ({
  column: { filterValue, setFilter },
}: FilterProps<any>) => {
  return (
    <input
      value={filterValue || ""}
      onChange={(e) => {
        setFilter(e.target.value || undefined); // Set undefined to remove the filter entirely
      }}
      placeholder={``}
      style={{ width: "80%" }}
    />
  );
};

export const filterAbsGreaterThan = (
  rows: Array<Row<any>>,
  id: Array<IdType<any>>,
  filterValue: FilterValue
) =>
  rows.filter((row: any) => {
    const rowValue = row.values[id[0]];
    if (
      typeof rowValue == "string" &&
      (rowValue.startsWith("inf") || rowValue == "NA")
    ) {
      return true;
    }
    if (id[0].includes("mlogp")) {
      return Math.pow(10, -rowValue) <= filterValue;
    } else {
      return Math.abs(rowValue) >= Number(filterValue);
    }
  });

export const filterLessThan = (
  rows: Array<Row<any>>,
  id: Array<IdType<any>>,
  filterValue: FilterValue
) =>
  rows.filter((row: any) => {
    const rowValue = row.values[id[0]];
    return rowValue <= Number(filterValue);
  });
