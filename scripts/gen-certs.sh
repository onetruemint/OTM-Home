#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

CERTS_DIR=${SCRIPT_DIR}/../.devcontainer/certs

DEFAULT_PASS=''
INFO="/C=US/ST=California/L=Los Angeles/O=OneTrueMint/OU=OTM Home/CN=Mint/emailAddress=''"

mkdir -p ${CERTS_DIR}

openssl genrsa -out ${CERTS_DIR}/server.key 2048

openssl req -subj "${INFO}" -new -key ${CERTS_DIR}/server.key -out ${CERTS_DIR}/server.csr

openssl x509 -req -in ${CERTS_DIR}/server.csr -signkey ${CERTS_DIR}/server.key -out ${CERTS_DIR}/server.crt