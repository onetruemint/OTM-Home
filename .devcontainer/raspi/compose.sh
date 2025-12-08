#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ENV_FILE="${SCRIPT_DIR}/../.env.raspi"

# Check if .env.raspi exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env.raspi file not found at $ENV_FILE"
    echo ""
    echo "Please create it by copying the example file:"
    echo "  cp ${SCRIPT_DIR}/../.env.raspi.example ${ENV_FILE}"
    echo ""
    echo "Then edit it with your backend server configuration."
    exit 1
fi

docker compose --env-file "$ENV_FILE" -f ${SCRIPT_DIR}/docker-compose.raspi.yml up -d