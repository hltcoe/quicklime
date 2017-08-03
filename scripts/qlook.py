#!/usr/bin/env python

"""Simple Bottle.py server for viewing Concrete Communications
"""

import argparse
import logging
import os.path
import sys
try:
    # python 2
    from urllib2 import urlopen
    from urlparse import urlparse
except ImportError:
    # python 3
    from urllib.parse import urlparse
    from urllib.request import urlopen
import zipfile

import humanfriendly
from redis import Redis

from concrete.util.access import CommunicationContainerFetchHandler, RelayFetchHandler
from concrete.util.comm_container import (
    DirectoryBackedCommunicationContainer,
    MemoryBackedCommunicationContainer,
    ZipFileBackedCommunicationContainer)
from concrete.util.mem_io import read_communication_from_buffer
from concrete.util.redis_io import RedisCommunicationReader
import quicklime


def error(message, status=1):
    logging.error(message)
    sys.exit(status)


def get_redis_comm(redis_host, redis_port, redis_comm, comm_lookup_by,
                   redis_comm_map, redis_comm_index, redis_direction,
                   communication_loc):
    def comm_lookup(comm):
        if comm_lookup_by == 'id':
            return comm.id
        elif comm_lookup_by == 'uuid':
            return comm.uuid.uuidString
        else:
            error('unsupported comm_lookup_by %s' % comm_lookup_by)

    input_db = None

    if redis_comm_index is not None:
        if redis_direction == RIGHT_TO_LEFT:
            redis_comm_index = -(redis_comm_index + 1)
        else:
            redis_comm_index = redis_comm_index
    else:
        redis_comm_index = None

    if redis_comm is not None and redis_comm_index is not None:
        error("Cannot include both --redis-comm and --redis-comm-index")

    input_db = Redis(redis_host, redis_port)
    reader = RedisCommunicationReader(input_db, communication_loc,
                                      add_references=True,
                                      right_to_left=(redis_direction ==
                                                     RIGHT_TO_LEFT))

    if redis_comm:
        # look up comm in collection by comm field (comm_lookup_by)
        key_type = input_db.type(communication_loc)

        if ((key_type == 'list' and redis_comm_map is None) or
                (key_type == 'set')):
            # do linear scan
            for co in reader:
                if comm_lookup(co) == redis_comm:
                    comm = co
                    break

        elif key_type == 'list' and redis_comm_map is not None:
            # look up list index using field->index map
            def no_comm(comm_idx):
                error(('Unable to find a communication with identifier "%s"'
                       ' with value "%s" using pivoting map "%s", which'
                       ' returned (list) index %s, under the %s %s') %
                      (comm_lookup_by,
                       redis_comm,
                       redis_comm_map,
                       str(comm_idx),
                       key_type,
                       communication_loc))

            comm_idx = input_db.hget(redis_comm_map, redis_comm)
            if comm_idx is None:
                no_comm(comm_idx)
            comm_idx = int(comm_idx)
            if redis_direction == RIGHT_TO_LEFT:
                comm_idx = - (comm_idx + 1)

            comm_buf = input_db.lindex(communication_loc, comm_idx)
            comm = read_communication_from_buffer(comm_buf)

            if comm_lookup(comm) != redis_comm:
                error(('Cannot find the appropriate document with %s'
                       ' indexing') % redis_direction)

        elif key_type == 'hash':
            # do O(1) hash lookup
            comm_buf = input_db.hget(communication_loc, redis_comm)
            comm = read_communication_from_buffer(comm_buf)

        else:
            error('Unknown key type %s' % (key_type))

        if comm is None:
            error(('Unable to find communication with id %s at %s:%s under'
                   ' key %s') %
                  (redis_comm, redis_host, redis_port,
                   communication_loc))

    elif redis_comm_index is not None:
        # lookup comm by index in list
        comm_buf = input_db.lindex(communication_loc, redis_comm_index)
        if comm_buf is None:
            error(('Unable to find communication with id %s at %s:%s under'
                   ' key %s') %
                  (redis_comm, redis_host, redis_port,
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
                  (redis_host, redis_port, communication_loc))
    return comm


def get_restful_comm(restful_host, restful_port, restful_pattern, communication_loc):
    url = urlparse('%s:%s' % (restful_host, restful_port))
    if url.netloc is None or len(url.netloc) == 0:
        h = 'http://%s' % (restful_host)
    else:
        h = '%s://%s' % (url.scheme, url.netloc)
    loc_pattern = restful_pattern % (communication_loc)
    logging.info('using location pattern %s' % loc_pattern)
    full = '%s:%s/%s' % (h, restful_port, loc_pattern)
    logging.info("querying %s" % full)
    resp = urlopen(full)
    if resp is None:
        error("Got back a None from querying %s" % (full))
    if resp.code != 200:
        error("received code %d and message %s from %s" % (
            resp.code, resp.msg, full))
    comm_buf = resp.read()
    resp.close()
    comm = read_communication_from_buffer(comm_buf)
    return comm


# Global constants
RIGHT_TO_LEFT = 'right-to-left'
LEFT_TO_RIGHT = 'left-to-right'


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        description='Read a communication from disk, redis, a REST server,'
                    ' or a FetchCommunicationService server'
                    ' and run a small webserver to visualize it.'
    )
    parser.add_argument('communication_locator',
                        nargs='?',
                        help='general locator of communication, either'
                        ' a path on disk; the key of communication(s) in redis;'
                        ' or a Communication.id to use with a RESTful server')
    parser.add_argument('--host', default='localhost',
                        help='Host interface to listen on')
    parser.add_argument('-p', '--port', type=int, default=8080)
    parser.add_argument('--log-level', default='INFO',
                        choices=('DEBUG', 'INFO', 'WARNING', 'ERROR'),
                        help='severity level at which to show log messages')

    parser.add_argument("--max-file-size", type=str, default="1GiB",
                        help="Maximum size of (non-ZIP) files that can be read into memory "
                        "(e.g. '2G', '300MB')")

    parser.add_argument('--fetch-host', type=str, default='localhost',
                        help='Host of FetchCommunicationService server')
    parser.add_argument('--fetch-port', type=int,
                        help='Port of FetchCommunicationService server')

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

    parser.add_argument('--restful-host', type=str, default='localhost',
                        help='(if using a RESTful service) hostname'
                        ' of RESTful server')
    parser.add_argument('--restful-port', type=int,
                        help='(if using a RESTful service) port'
                        ' of RESTful server')
    parser.add_argument('--restful-pattern', type=str,
                        default='communication/%s/tcompact',
                        help='(if using a RESTful service) the univariate '
                        ' endpoint pattern to query, as a %%-based format string.'
                        ' The default is communication/%%s/tcompact, where %%s'
                        ' is replaced by communication_locator')

    args = parser.parse_args()
    communication_loc = args.communication_locator

    logging.basicConfig(
        format='%(asctime)-15s %(levelname)s: %(message)s',
        level=args.log_level,
    )

    use_fetch_relay = False
    if args.fetch_port:
        use_fetch_relay = True

    use_redis = False
    if args.redis_port:
        use_redis = True

    use_restful = False
    if args.restful_port is not None:
        use_restful = True
        if args.comm_lookup_by != 'id':
            error("We can only lookup communications by id (not UUID) "
                  "with a RESTful service")

    if not (use_fetch_relay or use_redis or use_restful):
        if not communication_loc:
            error("You must specify a Communication path")
        elif not os.path.exists(communication_loc):
            error("Could not find Communication path '%s'" % communication_loc)

    if [use_fetch_relay, use_redis, use_restful].count(True) > 1:
        error("Can only use one Communication provider (Fetch, Redis, RESTful) at a time")

    if use_fetch_relay:
        fetch_handler = RelayFetchHandler(args.fetch_host, args.fetch_port)
    else:
        comm_container = {}

        if use_redis:
            comm = get_redis_comm(args.redis_host, args.redis_port, args.redis_comm,
                                  args.comm_lookup_by, args.redis_comm_map, args.redis_comm_index,
                                  args.redis_direction, communication_loc)
            comm_container[comm.id] = comm
        elif use_restful:
            comm = get_restful_comm(args.restful_host, args.restful_port,
                                    args.restful_pattern, communication_loc)
            comm_container[comm.id] = comm
        else:
            if os.path.isdir(communication_loc):
                comm_container = DirectoryBackedCommunicationContainer(communication_loc)
            elif zipfile.is_zipfile(communication_loc):
                comm_container = ZipFileBackedCommunicationContainer(communication_loc)
            else:
                max_file_size = humanfriendly.parse_size(args.max_file_size, binary=True)
                comm_container = MemoryBackedCommunicationContainer(communication_loc,
                                                                    max_file_size=max_file_size)
            logging.info('Using Communication Container of type %s' % type(comm_container))

        fetch_handler = CommunicationContainerFetchHandler(comm_container)

    qs = quicklime.QuicklimeServer(args.host, args.port, fetch_handler)
    qs.serve()


if __name__ == '__main__':
    main()
