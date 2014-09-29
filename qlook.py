#!/usr/bin/env python

"""Simple Bottle.py server for viewing Concrete Communications
"""

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
from concrete.util import read_communication_from_file, write_communication_to_file
from concrete.validate import validate_communication


class CommunicationHandler:
    """Implements Thrift RPC interface for CommunicationService
    """
    def readComm(self):
        # 'comm' is a HACKY global variable
        return comm

    def writeComm(self, c):
        write_communication_to_file(c, "annotated.concrete")


@route('/')
def index():
    return static_file("index.html", root="quicklime/templates")

@route('/quicklime/as_json')
def as_json():
    # communication_as_simplejson is a HACKY global variable
    return communication_as_simplejson

@post('/quicklime/thrift_endpoint/')
def thrift_endpoint():
    """Thrift RPC endpoint for CommunicationService API
    """
    itrans = TTransport.TFileObjectTransport(request.body)
    itrans = TTransport.TBufferedTransport(
        itrans, int(request.headers['Content-Length']))
    otrans = TTransport.TMemoryBuffer()
    iprot = tserver.inputProtocolFactory.getProtocol(itrans)
    oprot = tserver.outputProtocolFactory.getProtocol(otrans)

    # tserver is a HACKY global variable that references a
    # TServer.TServer instance that implements the Thrift API for a
    # CommunicationService using a TJSONProtocolFactory
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

# Thrift provides two JSON serializers: TJSONProtocolFactory and
# TSimpleJSONProtocolFactory.  The Simple version generates "human
# readable" JSON, where the Thrift fieldnames are specified using
# strings:
#
#    {"text": "Barber tells me - his son is colorblind / my hair is
#    auburn / and auburn is a shade of green", "metadata":
#    {"timestamp": 1409941905, "tool": "Annotation Example script",
#    "kBest": 1}, "type": "Tweet", "id": "Annotation_Test_1", "uuid":
#    {"uuidString": "24a00e5e-fc64-4ae3-bde7-73ed3c4c623a"}}
#
# Thrift can serialize objects to the SimpleJSON format, but does not
# (currently) provide API's for deserializing from the SimpleJSON
# format.
comm_simplejson_string = TSerialization.serialize(comm, TJSONProtocol.TSimpleJSONProtocolFactory())

# Convert JSON string to Python dictionary, so that Bottle will auto-magically convert
# the dictionary *back* to JSON, and serve page with Content-Type "application/json"
communication_as_simplejson = json.loads(comm_simplejson_string)

handler = CommunicationHandler()
processor = CommunicationService.Processor(handler)

# TJSONProtocolFactory generates JSON where the Thrift fieldnames are
# specified using the field numbers from the Thrift schema.  It also
# specifies types for each Thrift field (e.g. "str", "i32", "i64"):
#
#    [1,"readComm",2,0,{"0":{"rec":{"1":{"str":"Annotation_Test_1"},
#    "2":{"rec":{"1":{"str":"24a00e5e-fc64-4ae3-bde7-73ed3c4c623a"}}},
#    "3":{"str":"Tweet"},"4":{"str":"Barber tells me - his son is
#    colorblind / my hair is auburn / and auburn is a shade of
#    green"},"8":{"rec":{"1":{"str":"Annotation Example
#    script"},"2":{"i64":1409941905},"6":{"i32":1}}}}}}]
#
# Thrift RPC endpoints encode objects using this JSON format.
pfactory = TJSONProtocol.TJSONProtocolFactory()

# Another HACKY global variable
tserver = TServer.TServer(processor, None, None, None, pfactory, pfactory)


run(host='localhost', port=args.port)
