import logging

from thrift.transport import TTransport

from concrete.access import FetchCommunicationService
from concrete.access.ttypes import FetchResult
from concrete.services.ttypes import ServiceInfo
from concrete.util.thrift_factory import factory as thrift_factory


# TODO: FetchClient should be moved into concrete-python (probably
#       as FetchClientWrapper, to be consistent with existing
#       naming conventions
class FetchClient:
    def __init__(self, host, port):
        self.host = host
        self.port = port

    def __enter__(self):
        socket = thrift_factory.createSocket(self.host, int(self.port))
        self.transport = thrift_factory.createTransport(socket)
        protocol = thrift_factory.createProtocol(self.transport)

        cli = FetchCommunicationService.Client(protocol)
        self.transport.open()

        return cli

    def __exit__(self, type, value, traceback):
        self.transport.close()


class FetchRelay:
    """Implements a 'relay' to a FetchCommunicationService server.

    This service receives FetchCommunicationService Thrift RPC calls
    using HTTP/TJSONProtocol, and makes Thrift RPC calls using
    sockets/TCompactProtocol to another FetchCommunicationService
    server.

    The JavaScript implementation of Thrift only supports
    HTTP/TJSONProtocol (as of Thrift 0.10.0), but most implementations
    of the FetchCommunicationService use sockets/TCompactProtocol.
    """
    def __init__(self, host, port):
        self.host = host
        self.port = int(port)

    def about(self):
        logging.info('FetchRelay.about()')
        with FetchClient(self.host, self.port) as fetch_client:
            return fetch_client.about()

    def alive(self):
        logging.info('FetchRelay.alive()')
        with FetchClient(self.host, self.port) as fetch_client:
            return fetch_client.alive()

    def fetch(self, request):
        logging.info('FetchRelay.fetch()')
        with FetchClient(self.host, self.port) as fetch_client:
            return fetch_client.fetch(request)

    def getCommunicationCount(self):
        logging.info('FetchRelay.getCommunicationCount()')
        with FetchClient(self.host, self.port) as fetch_client:
            return fetch_client.getCommunicationCount()

    def getCommunicationIDs(self, offset, count):
        logging.info('FetchRelay.getCommunicationIDs(offset=%d, count=%d)' % (offset, count))
        with FetchClient(self.host, self.port) as fetch_client:
            return fetch_client.getCommunicationIDs(offset, count)


class FetchStub:
    """Minimal implementation of FetchCommunicationService.

    Serves only a single Communication, which is passed as a parameter
    to __init__().
    """
    def __init__(self, comm):
        self.comm = comm

    def about(self):
        logging.info('FetchStub received about() call')
        service_info = ServiceInfo()
        service_info.name = 'FetchStub'
        service_info.version = '0.0.1'
        return service_info

    def alive(self):
        logging.info('FetchStub.alive()')
        return True

    def fetch(self, request):
        logging.info('FetchStub.fetch()')
        # For the stub, we ignore the request object and always return the same Communication
        return FetchResult(communications=[self.comm])

    def getCommunicationCount(self):
        logging.info('FetchStub.getCommunicationCount()')
        return 1

    def getCommunicationIDs(self, offset, count):
        logging.info('FetchStub.getCommunicationIDs()')
        return [self.comm.id]
