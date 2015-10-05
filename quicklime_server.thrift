include "../concrete/thrift/communication.thrift"

namespace py quicklime_server

service QuicklimeServer {
  communication.Communication readComm()
  void writeComm(1: communication.Communication comm)
}
