from ..utils import get_gene_tuples, pad_gene
from ..file_utils import MatrixReader, write_json, common_filepaths
from .load_utils import Parallelizer, mtime
from ..conf_utils import conf

import numpy as np
from collections import defaultdict as dd
import json
import time
import pickle
import intervaltree
import os.path
import gzip
import mmap

def run(argv):
    if argv and '-h' in argv:
        print('get info for genes')
        exit(0)

    filepath = conf.data_dir +'/'
    ret_lines(filepath, argv[0] if argv else None)



def ret_lines(dataPath, matrixFile):
    '''
    Produces the json file with the best pvals for each gene
    '''

    #dictionary that contains for each chromosome a searchable tree so that each position returns the list of genes that the position belongs to
    treeDict = create_gene_tree()

    reader = line_iterator(dataPath, matrixFile)

    # gene/index mapping.
    geneList = np.loadtxt(common_filepaths['genes'],dtype = str,usecols = (3,))
    g2i = {gene:i for i,gene in enumerate(geneList)}

    # fetch info from first line of file
    # lenMeta is the length of the variant metadata
    # phenoTypes is the list with the name of the PhenoTypes
    # pVal index is the list of indexes where pvalues can be found
    # lenPheno is the size of the pheno type data chunk
    # phenoMeta is the ordered list of the info of the column (periodic by phenotype, length = lenPheno)
    lenMeta,phenoTypes,pValIndex,lenPheno,phenoMeta = pheno_tables(next(reader))

    #location of pvals in the line array
    listpValIndex = [lenMeta + elem for elem in pValIndex]

    # these are needed in for loops that I call over and over agan
    phenoRange = np.arange(len(phenoTypes))
    phenoMetaRange = np.arange(lenPheno)

    # matrix array structured as genes for rows and phenotypes as columns. it stores the best current pval
    pMatrix = np.ones((len(geneList),len(phenoTypes)),dtype = float)

    #final result dictionary
    resDict = dict()

    print('Importing pheno data...')
    # information to add about each phenotype to be taken from the json file.
    phenoDict = get_pheno_metadata(dataPath = dataPath)
    print('done.')

    #ALL THE PRE-PROCESSING HAS BEEN DONE. NOW WE CAN LOOP THROUGH THE VARIANTS

    print('Reading lines from ' + matrixFile if matrixFile is not None else (dataPath + 'generated-by-pheweb/matrix.tsv.gz'))
    currChrom = '1'
    geneChromDict = dd(lambda : dd(lambda : dd(lambda  : np.inf)))

    for line in reader:

        chrom,pos,ref,alt = line[0:4]
        rsids = line[4] if lenMeta > 4 else None

        # in case of new chromosomes, update results and create new geneChromDict
        if chrom != currChrom:

            # add results to resDict
            for gene in geneChromDict:
                # filtering the dict to keep only relevant pvals.
                resList= filter_phenos_local(gene,geneChromDict[gene])
                #add meta data from each pheno
                for pDict in resList:
                    phenocode = pDict['phenocode']
                    for key in phenoDict[phenocode]:
                        pDict[key] = phenoDict[phenocode][key]
                resDict[gene] = resList

            currChrom = chrom
            # print change of chromosome
            print('current chromosome: ' + str(currChrom))
            #create new geneChromDict
            geneChromDict = dd(lambda : dd(lambda : dd(lambda  : np.inf)))


        # work with floats only after the variant metadata
        try:
            pVals = np.array([convert_float(line[i]) for i in listpValIndex],dtype = float)
            for gene in treeDict[chrom][int(pos)]:
                gene = gene[-1]
                # get the index of the gene
                gIx = g2i[gene]

                #compare & update pvals
                pMask =  (pVals < pMatrix[gIx])
                pMatrix[gIx][pMask] = pVals[pMask]

                # now i need to enter the info of the variant
                for phenoIx in phenoRange[pMask]:
                    pheno = phenoTypes[phenoIx]
                    #get the data of the phenotype
                    for i in phenoMetaRange:
                        geneChromDict[gene][pheno][phenoMeta[i]] = float(line[lenMeta + lenPheno*phenoIx + i]) if line[lenMeta + lenPheno*phenoIx + i] != '' else ''

                    geneChromDict[gene][pheno]['chrom'] = chrom
                    geneChromDict[gene][pheno]['pos'] = pos
                    geneChromDict[gene][pheno]['ref'] = ref
                    geneChromDict[gene][pheno]['alt'] = alt
                    if rsids is not None:
                        geneChromDict[gene][pheno]['rsids'] = rsids
                    geneChromDict[gene][pheno]['phenocode'] = pheno
        except IndexError as e:
            print('unexpected line, n fields: ' + str(len(line)))
            print(line)
            raise

    # add last chr results to resDict
    for gene in geneChromDict:
        # filtering the dict to keep only relevant pvals.
        resList= filter_phenos_local(gene,geneChromDict[gene])
        #add meta data from each pheno
        for pDict in resList:
            phenocode = pDict['phenocode']
            for key in phenoDict[phenocode]:
                pDict[key] = phenoDict[phenocode][key]
        resDict[gene] = resList

    print('done.')

    print('Saving results in .json format... to ' + (dataPath + 'generated-by-pheweb/best-phenos-by-gene.json' if matrixFile is None else matrixFile + '_best-phenos-by-gene.json'))
    outFile = dataPath + 'generated-by-pheweb/best-phenos-by-gene.json' if matrixFile is None else matrixFile + '_best-phenos-by-gene.json'
    with open(outFile,'w') as o:
        json.dump(resDict,o)
    print('done.')
    return

def convert_float(elem):
    return float(elem or 1) if elem != 'NA' else 1


def filter_phenos_local(gene,best_assoc_for_pheno):
    '''
    Copy of the original function that filters only relevant pvals
    '''
    for phenocode,assoc in best_assoc_for_pheno.items():
        assoc['phenocode'] = phenocode
    phenos_in_gene = sorted(best_assoc_for_pheno.values(), key=lambda a:a['pval'])

    # decide how many phenotypes to include:
    #  - include all significant phenotypes.
    #  - always include at least three phenotypes.
    #  - include some of the first ten phenotypes based on pval heuristics.
    biggest_idx_to_include = 2
    for idx in range(biggest_idx_to_include, len(phenos_in_gene)):
        if phenos_in_gene[idx]['pval'] < 5e-8:
            biggest_idx_to_include = idx
        elif idx < 10 and phenos_in_gene[idx]['pval'] < 10 ** (-4 - idx//2): # formula is arbitrary
            biggest_idx_to_include = idx
        else:
            break
    return phenos_in_gene[:biggest_idx_to_include + 1]



def get_pheno_metadata(dataPath):

    '''
    Imports from pheno-list.json file the metadata of each phenotype
    '''
    phenoPath = dataPath + 'pheno-list.json'
    with open(phenoPath,'r') as json_data:
        d = json.load(json_data)
        phenoDict = dd(dict)
        for entry in d:
            pheno = str(entry['phenocode'])
            infoRejList = ['assoc_files','phenocode']
            for key in entry:
                if key not in infoRejList:
                    try:
                        phenoDict[pheno][key] = int(entry[key])
                    except:
                        phenoDict[pheno][key] = str(entry[key])
    return phenoDict


#####################
#--VARIANT PARSING--#
#####################

def pheno_tables(header):
    '''
    Processes the first line of the matrix file in order to store what the info is and where it's located.

    *IMPORTANT*: It works only with properly formatted pheno data, i.e. such that each phenotype has the same amount of entries.
    '''
    #lenMeta: find length of metadata
    for i,elem in enumerate(header):
        if '@' in elem:
            lenMeta = i
            break

    # phenoData: all data from phenotypes
    phenoData = header[lenMeta:]

    # phenoTypes: list of names of phenotypes
    phenoTypes = []
    for elem in [elem.split('@')[1] for elem in phenoData]:
        if elem not in phenoTypes:
            phenoTypes.append(elem)

    #lenPheno: size of chunk of data for each pheno
    lenPheno = len(phenoData)/len(phenoTypes)
    assert int(lenPheno) == lenPheno #checks that each phenotype has equal length
    lenPheno = int(lenPheno)

    #pValIndex: location of indexes that contain pvalue data
    pValIndex = []
    for i,elem in enumerate(phenoData):
        if 'pval' in elem:
            pValIndex.append(i)

    #phenoMeta: the names of the columns for each pheno (again, assuming regularity)
    phenoMeta = [elem.split('@')[0] for elem in  phenoData[:lenPheno]]
    return lenMeta,phenoTypes,pValIndex,lenPheno,phenoMeta




###########################
#-VARIANT TO GENE MAPPING-#
###########################


def create_gene_tree():
    '''
    This function goes through the genelist and creates a searchable tree for each chromosome and position.
    '''
    print('Initializing treeDict...')


    # dictionary that contains a tree for each chromosome key
    treeDict = dict()

    chrom_order_list = [str(i) for i in range(1,22+1)] + ['X', 'Y', 'MT']
    for chrom in chrom_order_list:
        treeDict[chrom] =  intervaltree.IntervalTree()

    for gene in get_gene_tuples():
        chrom, start, end, gene_symbol = gene
        start, end = pad_gene(start, end)
        treeDict[chrom][start:end] = gene_symbol

    if 'X' in treeDict:
        treeDict['23'] = treeDict['X']
    if 'Y' in treeDict:
        treeDict['24'] = treeDict['Y']
    if 'M' in treeDict:
        treeDict['25'] = treeDict['M']
    if 'MT' in treeDict:
        treeDict['25'] = treeDict['MT']

    print('TreeDict created.')
    return treeDict



#############################################
#----FUNCTIONS THAT READ THE MATRIX FILE----#
#############################################
def line_map(dataPath):


    filename = dataPath + 'generated-by-pheweb/matrix.tsv.gz'
    handle = open(filename, "r")
    mapped = mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ)
    gzfile = gzip.GzipFile(mode="r", fileobj=mapped)

    for line in gzfile:
        line = line.decode()
        yield line[:-1].split('\t')

def line_iterator(dataPath, matrixFile):

    if matrixFile is None:
        with gzip.open(dataPath + 'generated-by-pheweb/matrix.tsv.gz','rt' ) as f:
            for line in f:
                yield line[:-1].split('\t')
    else:
        with open(matrixFile) as f:
            for line in f:
                yield line[:-1].split('\t')
