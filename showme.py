#!/usr/bin/env python

import argparse
import json
import os.path
import sys

from bottle import HTTPResponse, post, request, route, run, static_file
from thrift import TSerialization
from thrift.protocol import TJSONProtocol
from thrift.server import TServer
from thrift.transport import TTransport

from concrete.communication_service import CommunicationService
from concrete.util import read_communication_from_file
from concrete.validate import validate_communication


class CommunicationHandler:
    """
    Simple class that implements Thrift RPC interface for CommunicationService
    """
    def readComm(self):
        return comm

    def writeComm(self, c):
        pass


@route('/')
def index():
    return static_file("index.html", root="quicklime/templates")

@route('/thrift_test')
def index():
    return static_file("thrift_test.html", root="quicklime/templates")

@route('/quicklime/as_json')
def as_json():
    # HACKY global variable used to save JSON for Communication
    return communication_as_json

@post('/quicklime/thrift_endpoint')
def thrift_endpoint():
    itrans = TTransport.TFileObjectTransport(request.body)
    itrans = TTransport.TBufferedTransport(
        itrans, int(request.headers['Content-Length']))
    otrans = TTransport.TMemoryBuffer()
    iprot = tserver.inputProtocolFactory.getProtocol(itrans)
    oprot = tserver.outputProtocolFactory.getProtocol(otrans)
    tserver.processor.process(iprot, oprot)
    bytestring = otrans.getvalue()

    headers = dict()
    headers['Content-Length'] = len(bytestring)
    headers['Content-Type'] = "application/x-thrift"
    return HTTPResponse(bytestring, **headers)

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

handler = CommunicationHandler()
processor = CommunicationService.Processor(handler)
pfactory = TJSONProtocol.TJSONProtocolFactory()

# Another hacky global variable
tserver = TServer.TServer(processor, None, None, None, pfactory, pfactory)


run(host='localhost', port=args.port)
