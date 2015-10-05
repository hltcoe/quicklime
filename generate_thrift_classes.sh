#!/bin/bash

thrift --gen js:jquery quicklime_server.thrift
thrift --gen py:new_style,utf8strings quicklime_server.thrift

# Copy generated Thrift classes
cp gen-js/QuicklimeServer.js quicklime/static/quicklime/QuicklimeServer.js
cp -a gen-py/quicklime_server/ quicklime_server/
