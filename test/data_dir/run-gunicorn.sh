#!/bin/bash

gunicorn --error-logfile=- --access-logfile=- -w4 --reload wsgi