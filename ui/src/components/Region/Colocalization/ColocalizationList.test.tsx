/* eslint-env jest */

import { Row } from "react-table";
import { CasualVariant, Colocalization, variantFromStr } from "../../../common/commonModel";
import { cell_locus_id1, cell_variant } from "./ColocalizationList";

test("locus id1", () => {
  const locus_id1 = variantFromStr("chr1_1_A_G");
  const row: Row<Colocalization> = {
    original: { locus_id1 },
  } as Row<Colocalization>;
  expect(cell_locus_id1(row)).toBe(locus_id1);
});

test("variant1 cell", () => {
  const variant = variantFromStr("chr1_1_A_G");
  const row: Row<CasualVariant> = {
    original: { variant },
  } as unknown as Row<CasualVariant>;
  expect(cell_variant(row)).toBe(variant);
});
