from django.conf import settings

from twisted.web import static, resource, server
from twisted.application import internet, service

from morbid import StompFactory

# Config
from orbited import logging, config
logging.setup(config.map)
HOTDOT_INTERFACE = getattr(settings, 'HOTDOT_INTERFACE', 'localhost')
HOTDOT_STOMP_PORT = getattr(settings, 'HOTDOT_STOMP_PORT', 9999)
#Runtime config, is there a cleaner way?:
config.map["[access]"]={(HOTDOT_INTERFACE, HOTDOT_STOMP_PORT):"*"}

HOTDOT_STATIC_PORT = getattr(settings, 'HOTDOT_STATIC_PORT', 8000)
HOTDOT_RESTQ_PROXY_PORT = getattr(settings, 'HOTDOT_RESTQ_PROXY_PORT', 5000)


#The below depend on Orbited's logging.setup(...), from above.
from orbited import cometsession
from orbited import proxy

#local imports
from hotdot.wsgi import get_root_resource
from hotdot.stompfactory import get_stomp_factory
#from realtime.message_handlers import MESSAGE_HANDLERS
from hotdot.filters import MessageIntermediaryResource  #RestQMessageProxy 

#TODO: twisted 'runapp':

#Twisted Application setup:
application = service.Application('hotdot')
serviceCollection = service.IServiceCollection(application)

# Django and static file server:
def django_service():
    root_resource = get_root_resource()
    root_resource.putChild("static", static.File("static"))
    http_factory = server.Site(root_resource, logPath="http.log")
    return internet.TCPServer(HOTDOT_STATIC_PORT, http_factory, interface=HOTDOT_INTERFACE)
#XXX setServiceParent(serviceCollection)

# Orbited server:
def orbited_service(root_resource):
    proxy_factory = proxy.ProxyFactory()
    return internet.GenericServer(cometsession.Port, factory=proxy_factory, resource=root_resource, 
        childName="tcp", interface=HOTDOT_INTERFACE)
#XXX .setServiceParent(serviceCollection)

def stomp_service():
    # Stomp server:
    stomp_factory = get_stomp_factory()
    return internet.TCPServer(HOTDOT_STOMP_PORT, stomp_factory, interface=HOTDOT_INTERFACE)
#XXX .setServiceParent(serviceCollection)

# RestQMessageProxy (message filter/logger/modifier):
def message_intermediary_service(handler_registry):
    #msg_inter_resource = RestQMessageProxy(handler_registry)
    msg_inter_resource = MessageIntermediaryResource(handler_registry)
    msg_inter_factory = server.Site(msg_inter_resource, logPath="")
    return internet.TCPServer(HOTDOT_RESTQ_PROXY_PORT, restq_proxy_factory, interface=HOTDOT_INTERFACE)
#XXX .setServiceParent(serviceCollection)
