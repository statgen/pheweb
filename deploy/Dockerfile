FROM debian:9

# can change this in k8s deployment yaml to serve from another directory
ENV PHEWEB_DIR /mnt/nfs/pheweb/r4

ENV LC_CTYPE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8

RUN apt-get update && apt-get install --no-install-recommends texlive wget --yes && \
    wget --no-check-certificate https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O /usr/local/bin/cloud_sql_proxy && \
    chmod +x /usr/local/bin/cloud_sql_proxy

RUN apt-get update && apt-get install python3-pip libffi-dev libz-dev libssl-dev libbz2-dev liblzma-dev --yes --fix-missing && \
    pip3 install cython

ADD . /pheweb

RUN pip3 install /pheweb

EXPOSE 8080
CMD cloud_sql_proxy -instances=phewas-development:europe-west1:pheweb=tcp:3306 -credential_file=/mnt/nfs/pheweb/phewas.sql.credentials.json & cd $PHEWEB_DIR && pheweb serve --port 8080 --num-workers 4
