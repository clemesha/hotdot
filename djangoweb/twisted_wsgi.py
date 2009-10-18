import sys
import os

from twisted.web import server, resource, wsgi, static
from twisted.python import threadpool
from twisted.internet import reactor

#Django's settings.py should exist in the same dir.
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings' 
from django.core.handlers.wsgi import WSGIHandler

def wsgi_resource():
    pool = threadpool.ThreadPool()
    pool.start()
    # Allow Ctrl-C to get you out cleanly:
    reactor.addSystemEventTrigger('after', 'shutdown', pool.stop)
    wsgi_resource = wsgi.WSGIResource(reactor, pool, WSGIHandler())
    return wsgi_resource

def get_root_resource():
    wsgi_root = wsgi_resource()
    return RootResource(wsgi_root)

class RootResource(resource.Resource):

    def __init__(self, wsgi_resource):
        resource.Resource.__init__(self)
        self.wsgi_resource = wsgi_resource

    def getChild(self, path, request):
        path0 = request.prepath.pop(0)
        request.postpath.insert(0, path0)
        return self.wsgi_resource

