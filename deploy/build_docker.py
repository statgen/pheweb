#!/usr/bin/env python

import shlex
from subprocess import Popen, PIPE,call,check_output
import argparse,datetime,subprocess


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Build Docker file")

    parser.add_argument("--image", type= str,
                        help="name of image",default = 'pheweb_annotation')
    parser.add_argument("--docker", type= str,
                        help="name of image",default = './deploy/Dockerfile')

    parser.add_argument("--version", type= str,
                        help="version value, e.g.0.001",required = True)
    parser.add_argument("--project", type= str,default = 'finngen-refinery-dev')

    parser.add_argument("--push",action = 'store_true')
    parser.add_argument("--args",type = str,default = '')
    args = parser.parse_args()


    basic_cmd = f'docker build -t eu.gcr.io/{args.project}/' + args.image +':' +args.version
    cmd = basic_cmd + f' -f {args.docker}  .' + ' ' + args.args
    print(cmd)
    call(shlex.split(cmd))

    if args.push:
        cmd = f' docker -- push eu.gcr.io/{args.project}/' + args.image +':' + args.version
        print(cmd)
        call(shlex.split(cmd))
