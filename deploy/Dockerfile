FROM debian:latest

ADD . /pheweb
ADD dot_pheweb /root/.pheweb

RUN apt-get update && \
    apt-get install python3-pip libffi-dev libz-dev libssl-dev --yes && \
    pip3 install /pheweb
    
EXPOSE 8080
CMD cd /pheweb-data/pheweb && pheweb serve --port 8080
