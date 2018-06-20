#base image
FROM ubuntu:16.04
MAINTAINER OriginTrail

RUN apt-get -qq update && apt-get -qq -y install curl
RUN curl -sL https://deb.nodesource.com/setup_9.x |  bash -
RUN apt-get -qq update && apt-get -qq -y install wget apt-transport-https software-properties-common build-essential git nodejs sqlite unzip
RUN add-apt-repository -y ppa:ethereum/ethereum && apt-get -qq update && apt-get install -y -qq ethereum geth
#ArangoDB
ADD testnet/install-arango.sh /install-arango.sh
RUN ["chmod", "+x", "/install-arango.sh"]
RUN /install-arango.sh

RUN export LC_ALL=C

#Clone the project
RUN wget https://codeload.github.com/OriginTrail/ot-node/zip/develop
RUN unzip develop -d . && rm develop && mv ot-node-develop ot-node

WORKDIR /ot-node
RUN mkdir keys data &> /dev/null
RUN cp .env.example .env && npm install
CMD node testnet/register-node.js
