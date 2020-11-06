FROM debian:9

# can change this in k8s deployment yaml to serve from another directory
ENV PHEWEB_DIR /mnt/nfs/pheweb/r6

ENV LC_CTYPE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8

RUN apt-get update && apt-get install curl software-properties-common --yes && \
    curl -sL https://deb.nodesource.com/setup_14.x | bash - && \
    apt-get install nodejs --yes

RUN apt-get update && apt-get install --no-install-recommends texlive wget --yes && \
    wget --no-check-certificate https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O /usr/local/bin/cloud_sql_proxy && \
    chmod +x /usr/local/bin/cloud_sql_proxy

ADD . /pheweb

RUN apt-get update && apt-get install default-libmysqlclient-dev git python3-pip libffi-dev libz-dev libssl-dev libbz2-dev liblzma-dev --yes --fix-missing && \
    pip3 install cython && \
    pip3 install pip --upgrade && \
    pip3 install /pheweb && \
    apt-get purge git --yes


# create react js bundle
RUN cd /pheweb/pheweb/serve/react && \
    npm install && node_modules/webpack/bin/webpack.js --config webpack.prod.js && \
    mv /pheweb/pheweb/serve/static/bundle.js /usr/local/lib/python3.5/dist-packages/pheweb/serve/static/ && \
    rm -r /pheweb

EXPOSE 8080
CMD cloud_sql_proxy -instances=phewas-development:europe-west1:pheweb=tcp:3306 -credential_file=/mnt/nfs/pheweb/phewas.sql.credentials.json & cd $PHEWEB_DIR && pheweb serve --port 8080 --num-workers 4
