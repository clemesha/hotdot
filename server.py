"""
File that demonstates minimal orbited usage.

"""
from twisted.web import static, resource, server
from twisted.application import internet, service

from morbid import StompFactory

# Config
from orbited import logging, config
logging.setup(config.map)
INTERFACE = "localhost"
#Runtime config, is there a cleaner way?:
config.map["[access]"]={(INTERFACE, 9999):"*"}
STATIC_PORT = 8000
RESTQ_PROXY_PORT = 5000
STOMP_PORT = 9999

#The below depend on Orbited's logging.setup(...), from above.
from orbited import cometsession
from orbited import proxy

#local imports
from djangoweb.twisted_wsgi import get_root_resource
from realtime.stompfactory import get_stomp_factory
from realtime.restq import RestQMessageProxy

root = get_root_resource()
root.putChild("static", static.File("static"))
http_factory = server.Site(root, logPath="http.log")


#Twisted Application boilerplate:
application = service.Application('orbited-dissected')
serviceCollection = service.IServiceCollection(application)


#Orbited:
proxy_factory = proxy.ProxyFactory()
internet.GenericServer(cometsession.Port, factory=proxy_factory, resource=root, childName="tcp", interface=INTERFACE).setServiceParent(serviceCollection)

#Stomp Listen:
stomp_factory = get_stomp_factory()
#stomp_factory = StompFactory(mqm=None, filename=None, rqaddr=None, verbose=True)
internet.TCPServer(STOMP_PORT, stomp_factory, interface=INTERFACE).setServiceParent(serviceCollection)

#Static resources
internet.TCPServer(STATIC_PORT, http_factory, interface=INTERFACE).setServiceParent(serviceCollection)

# RestQMessageProxy
restq_resource = RestQMessageProxy()
restq_proxy_factory = server.Site(restq_resource, logPath="restqproxy.log")
internet.TCPServer(RESTQ_PROXY_PORT, restq_proxy_factory, interface=INTERFACE).setServiceParent(serviceCollection)
