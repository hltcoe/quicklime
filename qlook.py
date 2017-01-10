#!/usr/bin/env python

"""Simple Bottle.py server for viewing Concrete Communications
"""

import argparse
import json
import logging
import os.path
import sys
import urllib2
import urlparse

from bottle import HTTPResponse, post, request, route, run, static_file
from redis import Redis
from thrift import TSerialization
from thrift.protocol import TJSONProtocol
from thrift.server import TServer
from thrift.transport import TTransport

from concrete.access import FetchCommunicationService
from concrete.access.ttypes import FetchResult
from concrete.services.ttypes import ServiceInfo
from concrete.util import (read_communication_from_buffer,
                           read_communication_from_file,
                           RedisCommunicationReader,
                           write_communication_to_file)
from concrete.util.thrift_factory import factory as thrift_factory
from concrete.validate import validate_communication


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
        socket = thrift_factory.createSocket(host, int(port))
        transport = thrift_factory.createTransport(socket)
        protocol = thrift_factory.createProtocol(transport)
        self.fetch_client = FetchCommunicationService.Client(protocol)
        transport.open()

    def about(self):
        logging.info('FetchRelay.about()')
        return self.fetch_client.about()

    def alive(self):
        logging.info('FetchRelay.alive()')
        return self.fetch_client.alive()

    def fetch(self, request):
        logging.info('FetchRelay.fetch()')
        return self.fetch_client.fetch(request)

    def getCommunicationCount(self):
        logging.info('FetchRelay.getCommunicationCount()')
        return self.fetch_client.getCommunicationCount()

    def getCommunicationIDs(self, offset, count):
        logging.info('FetchRelay.getCommunicationIDs(offset=%d, count=%d)' % (offset, count))
        return self.fetch_client.getCommunicationIDs(offset, count)


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


@route('/')
def index():
    return static_file("index.html", root="quicklime/templates")


@post('/quicklime/fetch_http_endpoint/')
def fetch_http_endpoint():
    """Thrift RPC endpoint for Concrete FetchCommunicationService
    """
    global TSERVER

    itrans = TTransport.TFileObjectTransport(request.body)
    itrans = TTransport.TBufferedTransport(
        itrans, int(request.headers['Content-Length']))
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
    return HTTPResponse(bytestring, **headers)


@route('/static/quicklime/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root='quicklime/static/quicklime')


def error(message, status=1):
    logging.error(message)
    sys.exit(status)


# GLOBAL VARIABLES
TSERVER = None


def main():
    global TSERVER

    RIGHT_TO_LEFT = 'right-to-left'
    LEFT_TO_RIGHT = 'left-to-right'

    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        description='Read a communication from disk, redis, a REST server, '
                    'or a FetchCommunicationService server '
                    'and run a small webserver to visualize it.'
    )
    parser.add_argument('communication_locator',
                        help='general locator of communication, either'
                        'a path on disk; the key of communication(s) in redis;'
                        'or a Communication.id to use with a RESTful server')
    parser.add_argument('-p', '--port', type=int, default=8080)
    parser.add_argument('--fetch-host', type=str, default='localhost',
                        help='Host of FetchCommunicationService server')
    parser.add_argument('--fetch-port', type=int,
                        help='Port of FetchCommunicationService server')
    parser.add_argument('--restful-host', type=str, default='localhost',
                        help='(if using a RESTful service) hostname '
                        'of RESTful server')
    parser.add_argument('--restful-port', type=int,
                        help='(if using a RESTful service) port '
                        'of RESTful server')
    parser.add_argument('--restful-pattern', type=str,
                        default='communication/%s/tcompact',
                        help='(if using a RESTful service) the univariate '
                        'endpoint pattern to query, as a %%-based format string.'
                        'The default is communication/%%s/tcompact, where %%s'
                        'is replaced by communication_locator')
    parser.add_argument('--redis-host', type=str, default='localhost',
                        help='(if using redis) hostname of redis server')
    parser.add_argument('--redis-port', type=int,
                        help='(if using redis) port of redis server')
    parser.add_argument('--redis-comm', type=lambda s: unicode(s, 'utf-8'),
                        help='(if using redis) value of communication id/uuid to'
                             ' show (use --comm-lookup-by to control id vs. uuid)')
    parser.add_argument('--comm-lookup-by', choices=['id', 'uuid'], default='id',
                        help='(if using redis) lookup communication by id or uuid')
    parser.add_argument('--redis-comm-map', type=str,
                        help='(if using redis) key of hash from id/uuid to index'
                             ' of communication in list (optional; will reduce'
                             ' lookup time)')
    parser.add_argument('--redis-comm-index', type=int,
                        help='(if using redis) list index of communication to show'
                             ' (incompatible with --redis-comm)')
    parser.add_argument('--redis-direction', default=RIGHT_TO_LEFT,
                        choices=(RIGHT_TO_LEFT, LEFT_TO_RIGHT),
                        help='(if using redis) direction to read communication'
                             ' list)')
    parser.add_argument('--log-level', default='INFO',
                        choices=('DEBUG', 'INFO', 'WARNING', 'ERROR'),
                        help='severity level at which to show log messages')
    args = parser.parse_args()
    communication_loc = args.communication_locator

    logging.basicConfig(
        format='%(asctime)-15s %(levelname)s: %(message)s',
        level=args.log_level,
    )

    use_redis = False
    if args.redis_port:
        use_redis = True

    use_restful = False
    if args.restful_port is not None:
        use_restful = True
        if args.comm_lookup_by != 'id':
            error("We can only lookup communications by id (not UUID)"
                  "with a RESTful service")

    if not os.path.isfile(communication_loc) and not (use_redis or use_restful):
        error("Could not find Communication file '%s'" % communication_loc)

    if use_redis and use_restful:
        error("Cannot read from both redis and RESTful")

    def comm_lookup(comm):
        if args.comm_lookup_by == 'id':
            return comm.id
        elif args.comm_lookup_by == 'uuid':
            return comm.uuid.uuidString
        else:
            error('unsupported comm_lookup_by %s' % args.comm_lookup_by)

    if args.redis_comm_index is not None:
        if args.redis_direction == RIGHT_TO_LEFT:
            redis_comm_index = -(args.redis_comm_index + 1)
        else:
            redis_comm_index = args.redis_comm_index
    else:
        redis_comm_index = None

    input_db = None
    if use_redis:
        if args.redis_comm is not None and redis_comm_index is not None:
            error("Cannot include both --redis-comm and --redis-comm-index")

        input_db = Redis(args.redis_host, args.redis_port)
        reader = RedisCommunicationReader(input_db, communication_loc,
                                          add_references=True,
                                          right_to_left=(args.redis_direction ==
                                                         RIGHT_TO_LEFT))

        if args.redis_comm:
            # look up comm in collection by comm field (comm_lookup_by)
            key_type = input_db.type(communication_loc)

            if ((key_type == 'list' and args.redis_comm_map is None) or
                    (key_type == 'set')):
                # do linear scan
                for co in reader:
                    if comm_lookup(co) == args.redis_comm:
                        comm = co
                        break

            elif key_type == 'list' and args.redis_comm_map is not None:
                # look up list index using field->index map
                def no_comm(comm_idx):
                    error(('Unable to find a communication with identifier "%s"'
                           ' with value "%s" using pivoting map "%s", which'
                           ' returned (list) index %s, under the %s %s') %
                          (args.comm_lookup_by,
                           args.redis_comm,
                           args.redis_comm_map,
                           str(comm_idx),
                           key_type,
                           communication_loc))

                comm_idx = input_db.hget(args.redis_comm_map, args.redis_comm)
                if comm_idx is None:
                    no_comm(comm_idx)
                comm_idx = int(comm_idx)
                if args.redis_direction == RIGHT_TO_LEFT:
                    comm_idx = - (comm_idx + 1)

                comm_buf = input_db.lindex(communication_loc, comm_idx)
                comm = read_communication_from_buffer(comm_buf)

                if comm_lookup(comm) != args.redis_comm:
                    error(('Cannot find the appropriate document with %s'
                           ' indexing') % args.redis_direction)

            elif key_type == 'hash':
                # do O(1) hash lookup
                comm_buf = input_db.hget(communication_loc, args.redis_comm)
                comm = read_communication_from_buffer(comm_buf)

            else:
                error('Unknown key type %s' % (key_type))

            if comm is None:
                error(('Unable to find communication with id %s at %s:%s under'
                       ' key %s') %
                      (args.redis_comm, args.redis_host, args.redis_port,
                       communication_loc))

        elif redis_comm_index is not None:
            # lookup comm by index in list
            comm_buf = input_db.lindex(communication_loc, redis_comm_index)
            if comm_buf is None:
                error(('Unable to find communication with id %s at %s:%s under'
                       ' key %s') %
                      (args.redis_comm, args.redis_host, args.redis_port,
                       communication_loc))
            else:
                comm = read_communication_from_buffer(comm_buf)
                logging.info('%dth Communication has id %s' %
                             (redis_comm_index + 1, comm.id))

        else:
            # take first comm in collection
            # (or return single comm stored in simple key)
            for co in reader:
                comm = co
                break

            if comm is None:
                error('Unable to find any communications at %s:%s under key %s' %
                      (args.redis_host, args.redis_port, communication_loc))
    elif use_restful:
        url = urlparse.urlparse('%s:%s' % (args.restful_host, args.restful_port))
        if url.netloc is None or len(url.netloc) == 0:
            h = 'http://%s' % (args.restful_host)
        else:
            h = '%s://%s' % (url.scheme, url.netloc)
        loc_pattern = args.restful_pattern % (communication_loc)
        logging.info('using location pattern %s' % loc_pattern)
        full = '%s:%s/%s' % (h, args.restful_port, loc_pattern)
        logging.info("querying %s" % full)
        resp = urllib2.urlopen(full)
        if resp is None:
            error("Got back a None from querying %s" % (full))
        if resp.code != 200:
            error("received code %d and message %s from %s" % (
                resp.code, resp.msg, full))
        comm_buf = resp.read()
        resp.close()
        comm = read_communication_from_buffer(comm_buf)
    else:
        comm = read_communication_from_file(communication_loc)


    # Log validation errors to console, but ignore return value
    validate_communication(comm)

    if args.fetch_port:
        handler = FetchRelay(args.fetch_host, args.fetch_port)
    else:
        handler = FetchStub(comm)
    processor = FetchCommunicationService.Processor(handler)

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
    TSERVER = TServer.TServer(processor, None, None, None, pfactory, pfactory)

    run(host='localhost', port=args.port)


if __name__ == '__main__':
    main()
