#!/bin/bash

export PGPASSWORD="$(cat postgres_password)"

psql -U pheweb_writer -d postgres -h localhost < schema.sql
