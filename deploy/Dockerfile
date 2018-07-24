FROM debian:latest

ADD . /pheweb
ADD dot_pheweb /root/.pheweb

RUN apt-get update && \
    apt-get install python3-pip libffi-dev libz-dev libssl-dev  --yes && \
    pip3 install /pheweb
   
RUN apt-get install --no-install-recommends texlive --yes

EXPOSE 8080
CMD cd /mnt/data-disk-ssd/pheweb && pheweb serve --port 8080
