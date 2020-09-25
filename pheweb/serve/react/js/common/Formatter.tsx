import {Cell} from "react-table";
import {Variant} from "./Model";
import React from "react";

export const cell_text = (props : Cell<string>) => (!props.value || props.value === 'NA' || props.value === '') ? 'NA' : props.value.replace(/_/g,' ')
export const cell_number = (props : Cell<number>) => (!props.value || props.value === 'NA' || props.value === '') ? 'NA' : props.value.toPrecision(2)
export const variant_link = (variant : Variant | undefined) : JSX.Element=> {
    return variant?<a href={ `/variant/${variant.chromosome}-${variant.position}-${variant.reference}-${variant.alternate}`}>
        {variant.chromosome}:{variant.position}:{variant.reference}:{variant.alternate}
    </a>:<span>variant</span>;
}
