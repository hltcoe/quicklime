#!/usr/bin/env python

import argparse
import json

from bottle import route, run, static_file
from thrift import TSerialization
from thrift.protocol import TJSONProtocol

from concrete.util import read_communication_from_file


# HACKY global variable used to save command-line argument
communication_filename = ''


@route('/')
def index():
    return static_file("index.html", root="view/templates")

@route('/view/as_json')
def as_json():
    comm = read_communication_from_file(communication_filename)
    comm_json_string = TSerialization.serialize(comm, TJSONProtocol.TSimpleJSONProtocolFactory())

    # Convert JSON string to Python dictionary, so that Bottle will auto-magically convert
    # the dictionary to JSON, and serve page with Content-Type "application/json"
    comm_dict = json.loads(comm_json_string)

    return comm_dict

@route('/static/view/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root='view/static/view')


parser = argparse.ArgumentParser(description="")
parser.add_argument("communication_file")
args = parser.parse_args()
communication_filename = args.communication_file

run(host='localhost', port=8080)
