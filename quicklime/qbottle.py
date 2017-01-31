import os.path

import bottle
from thrift.protocol import TJSONProtocol
from thrift.server import TServer
from thrift.transport import TTransport

from concrete.access import FetchCommunicationService


class QuicklimeServer(object):
    # DANGER WILL ROBINSON!  We are using class variables
    # to store values accessed by the Bottle route functions
    # below.
    FETCH_HANDLER = None
    TSERVER = None

    def __init__(self, host, port, fetch_handler):
        """
        Args:
        - `host`:
        - `port`:
        - `fetch_handler`:
        """
        self.host = host
        self.port = port
        QuicklimeServer.FETCH_HANDLER = fetch_handler
        processor = FetchCommunicationService.Processor(fetch_handler)
        pfactory = TJSONProtocol.TJSONProtocolFactory()
        QuicklimeServer.TSERVER = TServer.TServer(processor, None, None, None, pfactory, pfactory)

    def serve(self):
        bottle.run(host=self.host, port=self.port)


@bottle.get('/')
def index():
    if not bottle.request.GET.get('id') and \
       QuicklimeServer.FETCH_HANDLER.getCommunicationCount() > 1:
        bottle.redirect('/list/')
    else:
        templates_path = os.path.join(os.path.dirname(__file__), 'templates')
        return bottle.static_file('index.html', root=templates_path)


@bottle.get('/list/')
def list():
    templates_path = os.path.join(os.path.dirname(__file__), 'templates')
    return bottle.static_file('list.html', root=templates_path)


@bottle.post('/quicklime/fetch_http_endpoint/')
def fetch_http_endpoint():
    """Thrift RPC endpoint for Concrete FetchCommunicationService
    """
    itrans = TTransport.TFileObjectTransport(bottle.request.body)
    itrans = TTransport.TBufferedTransport(
        itrans, int(bottle.request.headers['Content-Length']))
    otrans = TTransport.TMemoryBuffer()

    iprot = QuicklimeServer.TSERVER.inputProtocolFactory.getProtocol(itrans)
    oprot = QuicklimeServer.TSERVER.outputProtocolFactory.getProtocol(otrans)

    QuicklimeServer.TSERVER.processor.process(iprot, oprot)
    bytestring = otrans.getvalue()

    headers = dict()
    headers['Content-Length'] = len(bytestring)
    headers['Content-Type'] = "application/x-thrift"
    return bottle.HTTPResponse(bytestring, **headers)


@bottle.route('/static/quicklime/<filepath:path>')
def server_static(filepath):
    static_path = os.path.join(os.path.dirname(__file__), 'static/quicklime')
    return bottle.static_file(filepath, root=static_path)
