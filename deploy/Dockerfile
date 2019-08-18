FROM debian:latest

ENV LC_CTYPE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8

ADD . /pheweb
ADD dot_pheweb /root/.pheweb

RUN apt-get update && \
    apt-get install python3-pip libffi-dev libz-dev libssl-dev  --yes && \
    pip3 install /pheweb && \
    wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O /usr/local/bin/cloud_sql_proxy && \
    chmod +x /usr/local/bin/cloud_sql_proxy

RUN apt-get install --no-install-recommends texlive --yes

EXPOSE 8080
CMD cloud_sql_proxy -instances=finngen-refinery-dev:europe-west1:cromwell=tcp:3306 & && cd /mnt/r3 && pheweb serve --port 8080
