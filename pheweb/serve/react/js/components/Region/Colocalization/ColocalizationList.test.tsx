/* eslint-env jest */

import {Cell, Row} from "react-table";
import {CasualVariant, Colocalization, variantFromStr} from "../../../common/Model";
import {RegionParameter, createParameter} from "./ColocalizationContext";
import {cell_locus_id1, cell_variant1} from "./ColocalizationList";
import {CasualVariantVector} from "./ColocalizationModel";

test('locus id1', () => {
    const locus_id1 = variantFromStr("chr1_1_A_G");
    const row : Row<Colocalization> = { original : { locus_id1 } } as Row<Colocalization>;
    expect(cell_locus_id1(row)).toBe(locus_id1)
});

test('variant1 cell', () => {
    const variant1 = variantFromStr("chr1_1_A_G");
    const row : Row<CasualVariant> = { original : { variant1 } } as Row<CasualVariant>;
    expect(cell_variant1(row)).toBe(variant1)
});
