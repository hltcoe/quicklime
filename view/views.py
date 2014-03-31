import json

from django.http import HttpResponse
from django.shortcuts import render
from thrift import TSerialization
from thrift.protocol import TJSONProtocol

from concrete.communication.ttypes import Communication

CONCRETE_FILE='agiga_example.concrete'


def as_json(request):
    comm = get_communication(CONCRETE_FILE)
    comm_json_string = TSerialization.serialize(comm, TJSONProtocol.TSimpleJSONProtocolFactory())
    return HttpResponse(comm_json_string, mimetype='application/json')


def index(request):
    context = {}
    return render(request, "index.html", context)



### Helper functions (TODO: Relocate to appropriate place)

def get_communication(communication_filename):
    comm = Communication()
    comm_bytestring = open(communication_filename).read()
    TSerialization.deserialize(comm, comm_bytestring)
    return comm
