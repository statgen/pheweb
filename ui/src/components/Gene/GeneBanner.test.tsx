/* eslint-env jest */
import { createSummary } from "./GeneBanner";

test('createSummary', () => {
  const match =
    {"MIM":"604655","_id":"9020","_score":91.48833,"ensembl":[{"gene":"ENSG00000006062"},{"gene":"ENSG00000282637"}],"entrezgene":"9020","name":"mitogen-activated protein kinase kinase kinase 14","summary":"This gene encodes mitogen-activated protein kinase kinase kinase 14, which is a serine/threonine protein-kinase. This kinase binds to TRAF2 and stimulates NF-kappaB activity. It shares sequence similarity with several other MAPKK kinases. It participates in an NF-kappaB-inducing signalling cascade common to receptors of the tumour-necrosis/nerve-growth factor (TNF/NGF) family and to the interleukin-1 type-I receptor. [provided by RefSeq, Jul 2008].","symbol":"MAP3K14"};
  const hits = { hits : [{"_id":"100133991","_score":103.37414,"entrezgene":"100133991","name":"MAP3K14 antisense RNA 1","symbol":"MAP3K14-AS1"},
                {"_id":"ENSG00000267278","_score":103.37414,"ensembl":{"gene":"ENSG00000267278"},"name":"MAP3K14 antisense RNA 1","symbol":"MAP3K14-AS1"},
                match] };
  expect(createSummary("APOE", null)).toStrictEqual({"symbol": "APOE"})
  expect(createSummary("APOE", [])).toStrictEqual({"symbol": "APOE"})
  expect(createSummary("APOE", hits)).toStrictEqual({"symbol": "APOE"})
  expect(createSummary("MAP3K14", hits)).toStrictEqual(match)
  expect(createSummary("MAP3K14-X", hits)).toStrictEqual({ "symbol" : "MAP3K14-X"})
})
