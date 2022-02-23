#!/bin/bash

set -euxo pipefail
if [ "$#" -ne 2 ]; then
    echo "$0 src dst"
    echo "src = <local file>"
    echo "dst = <gs://... , http://... , nfs://...>"
    exit 1
else
    src="$1"
    dst="$2"
    if [ -r "${src}" ]; then
	if [[ "$src" = http* ]]; then
	    cp_cmd='curl -T' # copy to webdav directory
	elif [[ "$url" = gs* ]]; then
	    cp_cmd='gsutil cp' # copy to bucket
	elif [[ "$url" = nfs* ]]; then
	    cp_cmd='nfs-cp' # copy to bucket
	else
	    echo "dst = <gs://... , http://... , nfs://...>"
	    exit 1
	fi
	($cp_cmd "$src" "$dst" )
    else
	echo "cannot read destination '${dst}'"
    fi
fi
