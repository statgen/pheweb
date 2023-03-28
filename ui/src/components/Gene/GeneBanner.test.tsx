/* eslint-env jest */
import { createSummary } from "./GeneBanner";
import { MyGene } from "./geneModel";

test('createSummary', () => {
  const match  = {"MIM":"191170",
                  "_id":"7157",
                  "_score":90.133484,
                  "ensembl":{"gene":"ENSG00000141510"},
                  "entrezgene":"7157",
                  "name":"tumor protein p53",
                  "summary":"This gene encodes a tumor suppressor protein containing transcriptional activation, DNA binding, and oligomerization domains. The encoded protein responds to diverse cellular stresses to regulate expression of target genes, thereby inducing cell cycle arrest, apoptosis, senescence, DNA repair, or changes in metabolism. Mutations in this gene are associated with a variety of human cancers, including hereditary cancers such as Li-Fraumeni syndrome. Alternative splicing of this gene and the use of alternate promoters result in multiple transcript variants and isoforms. Additional isoforms have also been shown to result from the use of alternate translation initiation codons from identical transcript variants (PMIDs: 12032546, 20937277). [provided by RefSeq, Dec 2016].",
                  "symbol":"TP53"};

  const hits : MyGene.Data = {"took":29,
    "total":394,"max_score":90.133484,"hits":[ match] };
  expect(createSummary("APOE", null)).toStrictEqual({"symbol": "APOE"})
  expect(createSummary("APOE", hits)).toStrictEqual({"symbol": "APOE"})
  expect(createSummary("TP53", hits)).toStrictEqual(match)
  expect(createSummary("MAP3K14-X", hits)).toStrictEqual({ "symbol" : "MAP3K14-X"})
})
