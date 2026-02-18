#!/usr/bin/env bash

set -e

pnpm i --frozen-lockfile

docker compose -f compose.prod.yml up -d --build --force-recreate