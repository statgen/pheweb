import { Cell } from "react-table";
import { Variant } from "./commonModel";
import React from "react";

export const cellText = (props : Cell<{}, string>) : string =>
  (!props.value || props.value == null || props.value === 'NA' || props.value === '') ? 'NA' : props.value.valueOf().replace(/_/g, ' ')

export const cellNumber = (props : Cell<{}, Number>) : string =>
  (!props.value || props.value == null) ? 'NA' : Number(props.value.valueOf()).toPrecision(2)

export const variantLink = (variant : Variant | undefined) : JSX.Element => {
  return variant ? <a href={`/variant/${variant.chromosome}-${variant.position}-${variant.reference}-${variant.alternate}`}>
    {`${variant.chromosome}:${variant.position}:${variant.reference}:${variant.alternate}`}
                   </a> : <span>NA</span>
}

export const decimalFormatter = (value, nan = 'NA') => isNaN(+value) ? (nan == null?value:nan) : (+value).toPrecision(3);
export const numberFormatter = (value, nan = 'NA') => isNaN(+value) ? (nan == null?value:nan) : (+value).toString();
export const scientificFormatter = (value, nan = 'NA') => isNaN(+value) ? (nan == null?value:nan) : (+value).toExponential(1);
export const shortNumberFormatter = (value, nan = 'NA') => isNaN(+value) ? (nan == null?value:nan) : (+value).toPrecision(1)

