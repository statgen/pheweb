
import os
import glob
import pysam
import argparse
import gzip
import subprocess



def run(argv):
    '''
        This module generates matrix from external single association results for fast access to browsingself.
        First parameter should be a path to configuration file with 5 colums(no header):
            1: phenotype name which matches FINNGEN phenotypes
            2: free form phenotype text
            3:  N_cases
            4:  n_controls
            5: path to result file with columns: chr,pos,ref,alt,beta,p-value + any addional columns
        Second parameter should be a path to (empty/not existing) directory where the data should be stored
        Third parameter should be file with common sites in format chr:pos:ref:alt one per line and in the same order as in the result files.
    '''

    parser = argparse.ArgumentParser(description="Create tabixed big matrix for external results")
    parser.add_argument('config_file', action='store', type=str, help='Configuration file ')
    parser.add_argument('path_to_res', action='store', type=str, help='Prefix filepath where the results will be saved')
    parser.add_argument('common_sites', action='store', type=str, help='common sites in the files. need to be in chr pos order')
    parser.add_argument('--chr', default="chr", action='store', type=str, help='chr column name in result files')
    parser.add_argument('--pos', default="pos", action='store', type=str, help='pos column name in result files')
    parser.add_argument('--ref', default="ref", action='store', type=str, help='ref column name in result files')
    parser.add_argument('--alt', default="alt", action='store', type=str, help='alt column name in result files')
    parser.add_argument('--other_fields', action='store', type=str, help='comma separated list of other column names in result files')

    args = parser.parse_args()
    phenos = []

    CPRA_fields = [  args.chr, args.pos, args.ref, args.alt ]

    supp_fields = []
    if(args.other_fields):
        supp_fields = [ f.strip() for f in args.other_fields.split(",")]

    req_fields = list(CPRA_fields)
    req_fields.extend(supp_fields)


    with open( args.path_to_res + "matrix.tsv","w") as out:
        with open(args.config_file,'r') as conf:
            out.write("\t".join(["#chr","pos","ref","alt"]) )
            for line in conf:
                line = line.rstrip("\n").split("\t")
                op = gzip.open if(line[4].endswith(".gz")) else open

                resf = op(line[4],'rt')
                header = resf.readline().rstrip("\n").split("\t")
                if not all( [ r in header  for r in req_fields] ):
                    raise Exception("All requested columns ( " + ",".join(req_fields) + ") does not exist in file:" + line[4])

                phenos.append( { "phenoid":line[0], "phenotext":line[1],
                                "ncases":line[2], "ncontrol":line[3],"filename":line[4], "fpoint":resf,
                                "cpra_ind":[ header.index(f) for f in CPRA_fields  ], "other_i":[ header.index(f) for f in supp_fields ],
                                "cur_line":[]  }  )

                out.write( "\t" +  "\t".join( [ s + "@" + line[0] for s in supp_fields] )  )

        out.write("\n")

        with open(args.common_sites) as common:

            for v in common:
                varid = v.rstrip("\n").split("\t")
                if(len(varid)<4):
                    raise Exception("Less than 4 columns in common sites row " + v )

                out.write("\t".join(varid) )
                for p in phenos:
                    resf = p["fpoint"]

                    if( len(p["cur_line"])==0):
                        # read all next positions in to memory as there can be multiallelic in same positions and they might
                        # not be in consistent order.
                        while(True):
                            pos = resf.tell()
                            l = resf.readline()
                            if ( l==""):
                                break

                            l= l.rstrip("\n").split("\t")
                            dat = [  l[i] for i in p["cpra_ind"] + p["other_i"] ]

                            same_pos = all( [ prev[0]==dat[0] and prev[1]==dat[1] for prev in p["cur_line"]] )
                            if( same_pos  ):
                                p["cur_line"].append( dat )
                            else:
                                # backtrack as there are variants in current pos to process
                                resf.seek(pos)
                                break

                    match_idx = [ i for i,v in  enumerate(p["cur_line"]) if all([ varid[j]==v[j] for j in [0,1,2,3 ] ]) ]

                    if len(match_idx)==0:
                        ## not matching.... write blanks,
                        out.write("\t" + "\t".join( ["NA"] * len(supp_fields)))
                    else:
                        out.write( "\t" + "\t".join( p["cur_line"][match_idx[0]][4:] ) )
                        del p["cur_line"][match_idx[0]]

                out.write("\n")


    subprocess.check_call(["bgzip", args.path_to_res + "matrix.tsv" ])
    subprocess.check_call(["tabix","-s 1","-e 2","-b 2", args.path_to_res + "matrix.tsv.gz" ])

run("asd")
