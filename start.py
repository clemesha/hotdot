"""
File that demonstates minimal orbited usage.

"""
from string import Template
from twisted.web import static, resource, server
from twisted.application import internet, service

from morbid import StompFactory
from stomp_produce import ProduceData
from stompfactory import get_stomp_factory

# Config
from orbited import logging, config
logging.setup(config.map)
INTERFACE = "localhost"
#Runtime config, is there a cleaner way?:
config.map["[access]"]={(INTERFACE, 9999):"*"}
STATIC_PORT = 8000
STOMP_PORT = 9999
CHANNEL_NAME = "/topic/test"
INTERVAL = 1.5 #seconds

#The below depend on logging.setup(...)
from orbited import cometsession
from orbited import proxy


class Root(resource.Resource):

    def getChild(self, name, request):
        if name == '':
            return self
        return resource.Resource.getChild(self, name, request)
    
    def render_GET(self, request):
        fs = open("index.html").read()
        args = {"STOMP_PORT":STOMP_PORT, "CHANNEL_NAME":CHANNEL_NAME, "HOST":INTERFACE}
        tmpl = Template(fs).substitute(args)
        return tmpl

root = Root()
root.putChild("static", static.File("static"))
http_factory = server.Site(root)

#from twisted.internet import reactor
#reactor.listenWith(cometsession.Port, factory=proxy.ProxyFactory(), resource=root, childName="tcp", interface=INTERFACE)

#Twisted Application boilerplate:
application = service.Application('orbited-dissected')
serviceCollection = service.IServiceCollection(application)

proxy_factory = proxy.ProxyFactory()
internet.GenericServer(cometsession.Port, factory=proxy_factory, resource=root, childName="tcp", interface=INTERFACE).setServiceParent(serviceCollection)

#Stomp Listen:
stomp_factory = get_stomp_factory()
#stomp_factory = StompFactory(mqm=None, filename=None, rqaddr=None, verbose=True)
internet.TCPServer(STOMP_PORT, stomp_factory, interface=INTERFACE).setServiceParent(serviceCollection)

#Stomp Produce Data Connect:
produce_data_factory = ProduceData(channel_name=CHANNEL_NAME, push_interval=INTERVAL)
internet.TCPClient(INTERFACE, STOMP_PORT, produce_data_factory).setServiceParent(serviceCollection)

#Static resources
internet.TCPServer(STATIC_PORT, http_factory, interface=INTERFACE).setServiceParent(serviceCollection)
