import os.path

import bottle
from thrift.transport import TTransport


# GLOBAL VARIABLES
PRELOADED_COMM_FLAG = True
TSERVER = None


# TODO: Replace this with something less hacky
def set_preloaded_comm_flag(flag):
    global PRELOADED_COMM_FLAG
    PRELOADED_COMM_FLAG = flag


def set_tserver(tserver):
    global TSERVER
    TSERVER = tserver


@bottle.get('/')
def index():
    global PRELOADED_COMM_FLAG

    if not PRELOADED_COMM_FLAG and not bottle.request.GET.get('id'):
        bottle.redirect('/list/')
    else:
        return bottle.static_file('index.html', root=os.path.join(os.path.dirname(__file__), 'templates'))


@bottle.get('/list/')
def list():
    return bottle.static_file('list.html', root=os.path.join(os.path.dirname(__file__), 'templates'))


@bottle.post('/quicklime/fetch_http_endpoint/')
def fetch_http_endpoint():
    """Thrift RPC endpoint for Concrete FetchCommunicationService
    """
    global TSERVER

    itrans = TTransport.TFileObjectTransport(bottle.request.body)
    itrans = TTransport.TBufferedTransport(
        itrans, int(bottle.request.headers['Content-Length']))
    otrans = TTransport.TMemoryBuffer()

    iprot = TSERVER.inputProtocolFactory.getProtocol(itrans)
    oprot = TSERVER.outputProtocolFactory.getProtocol(otrans)

    # TSERVER is a HACKY global variable that references a
    # TServer.TServer instance that implements the Thrift API for
    # FetchCommunicationService using a TJSONProtocolFactory
    TSERVER.processor.process(iprot, oprot)
    bytestring = otrans.getvalue()

    headers = dict()
    headers['Content-Length'] = len(bytestring)
    headers['Content-Type'] = "application/x-thrift"
    return bottle.HTTPResponse(bytestring, **headers)


@bottle.route('/static/quicklime/<filepath:path>')
def server_static(filepath):
    return bottle.static_file(filepath, root=os.path.join(os.path.dirname(__file__), 'static/quicklime'))
