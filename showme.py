#!/usr/bin/env python

import argparse
import json
import os.path
import sys

from bottle import route, run, static_file
from thrift import TSerialization
from thrift.protocol import TJSONProtocol

from concrete.util import read_communication_from_file
from concrete.validate import validate_communication


@route('/')
def index():
    return static_file("index.html", root="quicklime/templates")

@route('/quicklime/as_json')
def as_json():
    # HACKY global variable used to save JSON for Communication
    return communication_as_json

@route('/static/quicklime/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root='quicklime/static/quicklime')


parser = argparse.ArgumentParser(description="")
parser.add_argument("communication_file")
parser.add_argument("-p", "--port", default=8080)
args = parser.parse_args()
communication_filename = args.communication_file

if not os.path.isfile(communication_filename):
    print "ERROR: Could not find Communication file '%s'" % communication_filename
    sys.exit()

comm = read_communication_from_file(communication_filename)

# Log validation errors to console, but ignore return value
validate_communication(comm)

comm = read_communication_from_file(communication_filename)
comm_json_string = TSerialization.serialize(comm, TJSONProtocol.TSimpleJSONProtocolFactory())

# Convert JSON string to Python dictionary, so that Bottle will auto-magically convert
# the dictionary to JSON, and serve page with Content-Type "application/json"
communication_as_json = json.loads(comm_json_string)


run(host='localhost', port=args.port)
