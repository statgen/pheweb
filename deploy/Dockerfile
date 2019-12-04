FROM debian:latest

ENV LC_CTYPE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8

ADD . /pheweb

RUN apt-get update && \
    apt-get install python3-pip libffi-dev libz-dev libssl-dev libbz2-dev liblzma-dev wget --yes && \
    pip3 install /pheweb

RUN wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O /usr/local/bin/cloud_sql_proxy && \
    chmod +x /usr/local/bin/cloud_sql_proxy

RUN apt-get install --no-install-recommends texlive --yes

EXPOSE 8080
CMD cloud_sql_proxy -instances=phewas-development:europe-west1:pheweb=tcp:3306 -credential_file=/mnt/pheweb/phewas.sql.credentials.json & cd /mnt/pheweb && pheweb serve --port 8080
