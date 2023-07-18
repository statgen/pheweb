FROM docker:20.10.12
FROM debian:10

# can change this in k8s deployment yaml to serve from another directory
ENV PHEWEB_DIR /mnt/nfs/pheweb
ENV CLOUD_SQL_PROXY_CREDENTIAL_FILE /etc/gcp/cloud-sql-credentials.json
ENV CLOUD_SQL_PROXY_INSTANCES phewas-development:europe-west1:pheweb=tcp:3306

RUN groupadd -r -g 1000 cloudsdk && \
    useradd -r -u 1000 -m -s /bin/bash -g cloudsdk cloudsdk

# create and setup the en_US.UTF-8 locale
RUN apt-get upgrade --yes && apt-get update --yes && apt-get install locales --yes
RUN echo "LC_ALL=en_US.UTF-8" >> /etc/environment
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
RUN echo "LANG=en_US.UTF-8" > /etc/locale.conf
RUN locale-gen en_US && locale-gen en_US.UTF-8
ENV LC_CTYPE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8

RUN apt-get update --allow-releaseinfo-change
RUN apt-get install make gcc libz-dev libbz2-dev liblzma-dev zlib1g-dev --yes
RUN apt-get install cmake libcurl4-openssl-dev  --yes

# install nodejs
RUN apt-get install curl software-properties-common gnupg --yes
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -x -
RUN apt-get install nodejs --yes


RUN apt-get update && apt-get install --no-install-recommends texlive wget --yes
# install cloudsql
RUN wget --no-check-certificate https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O /usr/local/bin/cloud_sql_proxy && \
    chmod +x /usr/local/bin/cloud_sql_proxy

RUN curl -LO https://github.com/samtools/htslib/releases/download/1.9/htslib-1.9.tar.bz2 && \
    tar -xvjf htslib-1.9.tar.bz2 && cd htslib-1.9 && \
    ./configure && make && make install && cd .. && rm -rf htslib-1.9*


ADD . /pheweb

# install python packages and perquisites
RUN apt-get update && apt-get install default-libmysqlclient-dev git python3-pip libffi-dev libz-dev  libbz2-dev liblzma-dev libssl-dev --yes --fix-missing
RUN python3 -m pip install cython
RUN apt-get install rustc --yes
RUN python3 -m pip install pip==20.1.1 --upgrade
RUN python3 -m pip install /pheweb
RUN python3 -m pip freeze

# create react js bundle
RUN cd /pheweb/ui && npm install
RUN cd /pheweb/ui && npm run build
RUN cp -R /pheweb/pheweb/serve/static/* /usr/local/lib/python3.7/dist-packages/pheweb/serve/static/
RUN rm -r /pheweb

ADD . /pheweb
ADD pheweb/load/external_matrix.py /usr/local/bin/

# remove build tools
RUN apt-get purge git gcc rustc cmake --yes

EXPOSE 8080
CMD cloud_sql_proxy -instances=$CLOUD_SQL_PROXY_INSTANCES -credential_file=$CLOUD_SQL_PROXY_CREDENTIAL_FILE & cd $PHEWEB_DIR && pheweb serve --port 8080 --num-workers 1
