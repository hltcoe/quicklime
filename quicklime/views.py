import json
import StringIO

from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from thrift import TSerialization
from thrift.protocol import TJSONProtocol
from thrift.server import TServer
from thrift.transport import TTransport

from concrete.communication.ttypes import Communication
from concrete.communication_service import CommunicationService
from concrete.util import read_communication_from_file

CONCRETE_FILE='agiga_example.concrete'


class CommunicationHandler:
    """
    Simple class that implements Thrift RPC interface for CommunicationService
    """
    def readComm(self):
        comm = get_communication(CONCRETE_FILE)
        return comm

    def writeComm(self, c):
        pass


def as_json(request):
    comm = get_communication(CONCRETE_FILE)
    comm_json_string = TSerialization.serialize(comm, TJSONProtocol.TSimpleJSONProtocolFactory())
    return HttpResponse(comm_json_string, mimetype='application/json')


def index(request):
    context = {}
    return render(request, "index.html", context)


@csrf_exempt
def thrift_endpoint(request):
    handler = CommunicationHandler()
    processor = CommunicationService.Processor(handler)
    pfactory = TJSONProtocol.TJSONProtocolFactory()
    tserver = TServer.TServer(processor, None, None, None, pfactory, pfactory)

    request_as_file_object = StringIO.StringIO(request.body)

    itrans = TTransport.TFileObjectTransport(request_as_file_object)
    itrans = TTransport.TBufferedTransport(
        itrans, int(request.META['CONTENT_LENGTH']))
    otrans = TTransport.TMemoryBuffer()
    iprot = tserver.inputProtocolFactory.getProtocol(itrans)
    oprot = tserver.outputProtocolFactory.getProtocol(otrans)
    tserver.processor.process(iprot, oprot)
    bytestring = otrans.getvalue()

    return HttpResponse(bytestring, content_type="application/x-thrift")


### Helper functions (TODO: Relocate to appropriate place)

def get_communication(communication_filename):
    comm = Communication()
    comm_bytestring = open(communication_filename).read()
    TSerialization.deserialize(comm, comm_bytestring)
    return comm
