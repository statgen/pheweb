
import os
import glob
import pysam
import argparse
import gzip
import subprocess



chrord = { "chr"+str(chr):int(chr) for chr in list(range(1,23))}
chrord["chrX"] = 23
chrord["chrT"] = 24
chrord["chrMT"] = 25

chrord.update({str(chr):int(chr) for chr in list(range(1,23)) } )


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

            smallestpos = (0,0)
            for v in common:
                linedat = []
                anymatch =False
                varid = v.rstrip("\n").split("\t")
                if(len(varid)<4):
                    raise Exception("Less than 4 columns in common sites row " + v )
                linedat.extend(varid )
                if(  smallestpos[0]>int(varid[0]) or int(varid[1])<smallestpos[1] ):
                    # have not reached the smallest result so keep on scrolling variants
                    print("skipping " + str(varid) + " smalles" + str(smallestpos) )
                    continue

                for p in phenos:

                    resf = p["fpoint"]
                    if( len(p["cur_line"])==0 or (p["cur_line"][0][0]!=varid[0] or  p["cur_line"][0][1]!=varid[1] )  ):
                        # read all next positions in to memory as there can be multiallelic in same positions and they might
                        # not be in consistent order.
                        p["cur_line"].clear()
                        pos = resf.tell()
                        l = resf.readline()
                        if ( l!=""):
                            l= l.rstrip("\n").split("\t")
                            dat = [  l[i] for i in p["cpra_ind"] + p["other_i"] ]

                            while( varid[0]==dat[0] and int(varid[1])>=int(dat[1]) ):
                                if(varid[1]==dat[1]):
                                    p["cur_line"].append( dat )
                                pos = resf.tell()
                                l = resf.readline()
                                if ( l==""):
                                    break
                                l= l.rstrip("\n").split("\t")
                                dat = [  l[i] for i in p["cpra_ind"] + p["other_i"] ]

                            if( chrord[dat[0]] <smallestpos[0] or int(dat[1]) < smallestpos[1]  ):
                                smallestpos = ( chrord[dat[0]], int(dat[1]) )
                            # jump the cursor back to
                            resf.seek(pos)

                    match_idx = [ i for i,v in  enumerate(p["cur_line"]) if all([ varid[j]==v[j] for j in [0,1,2,3 ] ]) ]

                    if len(match_idx)==0:
                        ## not matching.... write blanks,
                        linedat.extend(["NA"] * len(supp_fields))
                        #out.write("\t" + "\t".join( ["NA"] * len(supp_fields)))
                    else:
                        anymatch=True
                        linedat.extend(p["cur_line"][match_idx[0]][4:])
                        #out.write( "\t" + "\t".join( p["cur_line"][match_idx[0]][4:] ) )
                        del p["cur_line"][match_idx[0]]
                if(anymatch):
                    out.write("\t".join(linedat) + "\n")
                linedat.clear()



    subprocess.check_call(["bgzip", args.path_to_res + "matrix.tsv" ])
    subprocess.check_call(["tabix","-s 1","-e 2","-b 2", args.path_to_res + "matrix.tsv.gz" ])

run("asd")
