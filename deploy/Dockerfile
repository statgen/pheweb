FROM debian:10

# can change this in k8s deployment yaml to serve from another directory
ENV PHEWEB_DIR /mnt/nfs/pheweb/r6
ENV CLOUD_SQL_PROXY_CREDENTIAL_FILE /mnt/nfs/pheweb/phewas.sql.credentials.json
ENV CLOUD_SQL_PROXY_INSTANCES phewas-development:europe-west1:pheweb=tcp:3306

# create and setup the en_US.UTF-8 locale
RUN apt-get upgrade --yes && apt-get update --yes && apt-get install locales --yes
RUN echo "LC_ALL=en_US.UTF-8" >> /etc/environment
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
RUN echo "LANG=en_US.UTF-8" > /etc/locale.conf
RUN locale-gen en_US && locale-gen en_US.UTF-8
ENV LC_CTYPE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8

# install nodejs
RUN apt-get update && apt-get install curl software-properties-common --yes && \
    curl -sL https://deb.nodesource.com/setup_14.x | bash - && \
    apt-get install nodejs --yes

# install cloudsql
RUN apt-get update && apt-get install --no-install-recommends texlive wget --yes && \
    wget --no-check-certificate https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O /usr/local/bin/cloud_sql_proxy && \
    chmod +x /usr/local/bin/cloud_sql_proxy

# copy pheweb source
ADD . /pheweb


# install python packages and perquisites
RUN apt-get update && apt-get install default-libmysqlclient-dev git python3-pip libffi-dev libz-dev libssl-dev libbz2-dev liblzma-dev --yes --fix-missing && \
     python3 -m pip install cython && \
     python3 -m pip install pip==20.1.1 --upgrade && \
     python3 -m pip install /pheweb && \
     python3 -m pip freeze && \
     apt-get purge git --yes

# create react js bundle
RUN cd /pheweb/pheweb/serve/react && \
    npm install && node_modules/webpack/bin/webpack.js --config webpack.prod.js && \
    mv /pheweb/pheweb/serve/static/bundle.js /usr/local/lib/python3.7/dist-packages/pheweb/serve/static/ && \
    rm -r /pheweb

EXPOSE 8080
CMD cloud_sql_proxy -instances=$CLOUD_SQL_PROXY_INSTANCES -credential_file=$CLOUD_SQL_PROXY_CREDENTIAL_FILE & cd $PHEWEB_DIR && pheweb serve --port 8080 --num-workers 4
