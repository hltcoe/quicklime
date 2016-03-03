#!/usr/bin/env python

"""Simple Bottle.py server for viewing Concrete Communications
"""

import argparse
import json
import os.path
import sys

import logging

from bottle import HTTPResponse, post, request, route, run, static_file
from thrift import TSerialization
from thrift.protocol import TJSONProtocol
from thrift.server import TServer
from thrift.transport import TTransport

from concrete.util import (read_communication_from_buffer,
                           read_communication_from_file,
                           write_communication_to_file)
from concrete.util import RedisCommunicationReader
from concrete.validate import validate_communication

from quicklime_server import QuicklimeServer


class CommunicationHandler:
    """Implements Thrift RPC interface for QuicklimeServer
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
    """Thrift RPC endpoint for QuicklimeServer API
    """
    itrans = TTransport.TFileObjectTransport(request.body)
    itrans = TTransport.TBufferedTransport(
        itrans, int(request.headers['Content-Length']))
    otrans = TTransport.TMemoryBuffer()
    iprot = tserver.inputProtocolFactory.getProtocol(itrans)
    oprot = tserver.outputProtocolFactory.getProtocol(otrans)

    # tserver is a HACKY global variable that references a
    # TServer.TServer instance that implements the Thrift API for a
    # QuicklimeServer using a TJSONProtocolFactory
    tserver.processor.process(iprot, oprot)
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


RIGHT_TO_LEFT = 'right-to-left'
LEFT_TO_RIGHT = 'left-to-right'


parser = argparse.ArgumentParser(
    formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    description='Read a communication from disk or redis and run a small'
                ' webserver to visualize it.'
)
parser.add_argument('communication_loc',
                    help='path to communication on disk or key of'
                         ' communication(s) in redis')
parser.add_argument('-p', '--port', type=int, default=8080)
parser.add_argument('--redis-host', type=str,
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
communication_loc = args.communication_loc

logging.basicConfig(
    format='%(asctime)-15s %(levelname)s: %(message)s',
    level=args.log_level,
)

use_redis = False
if args.redis_port:
    use_redis = True
    if not args.redis_host:
        args.redis_host = "localhost"

if not os.path.isfile(communication_loc) and not use_redis:
    error("Could not find Communication file '%s'" % communication_loc)


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


comm = None
input_db = None
if use_redis:
    if args.redis_comm is not None and redis_comm_index is not None:
        error("Cannot include both --redis-comm and --redis-comm-index")

    from redis import Redis
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

            buf = input_db.lindex(communication_loc, comm_idx)
            comm = read_communication_from_buffer(buf)

            if comm_lookup(comm) != args.redis_comm:
                error(('Cannot find the appropriate document with %s'
                       ' indexing') % args.redis_direction)

        elif key_type == 'hash':
            # do O(1) hash lookup
            comm = input_db.hget(communication_loc, args.redis_comm)
            comm = read_communication_from_buffer(comm)

        else:
            error('Unknown key type %s' % (key_type))

        if comm is None:
            error(('Unable to find communication with id %s at %s:%s under'
                   ' key %s') %
                  (args.redis_comm, args.redis_host, args.redis_port,
                   communication_loc))

    elif redis_comm_index is not None:
        # lookup comm by index in list
        buf = input_db.lindex(communication_loc, redis_comm_index)
        if buf is None:
            error(('Unable to find communication with id %s at %s:%s under'
                   ' key %s') %
                  (args.redis_comm, args.redis_host, args.redis_port,
                   communication_loc))
        else:
            comm = read_communication_from_buffer(buf)
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

else:
    comm = read_communication_from_file(communication_loc)


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
comm_simplejson_string = TSerialization.serialize(
        comm, TJSONProtocol.TSimpleJSONProtocolFactory())

# Convert JSON string to Python dictionary, so that Bottle will auto-magically
# convert the dictionary *back* to JSON, and serve page with Content-Type
# "application/json"
communication_as_simplejson = json.loads(comm_simplejson_string)

handler = CommunicationHandler()
processor = QuicklimeServer.Processor(handler)

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
