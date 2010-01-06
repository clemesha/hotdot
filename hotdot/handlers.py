"""
Get all message handlers from all apps
that contain a subdirectory 'realtime'.

Load all functions in file?
OR
Require specifying of desired functions.

"""
from django.conf import settings

#TODO: when this is called with some django-admin func,
# use normal method to find INSTALLED_APPS

HANDLERS = ['connect', 'disconnect', 'subscribe', 'unsubscribe', 'send']


class BaseHandler(object):

    handlers = ['connect', 'disconnect', 'subscribe', 'unsubscribe', 'send']
    log = ['connect', 'disconnect', 'subscribe', 'unsubscribe', 'send']

    def connect(self, msg, username=None, channel_id=None):
        return msg

    def disconnect(self, msg, username=None, channel_id=None):
        return msg

    def subscribe(self, msg, username=None, channel_id=None):
        return msg

    def unsubscribe(self, msg, username=None, channel_id=None):
        return msg

    def send(self, msg, username=None, channel_id=None):
        return msg


class AlreadyRegistered(Exception):
    pass


def activate_registration(app):
    """
    Called from a django-admin.py or ./manage.py hotdot subcommand.
    Initiates registration of a message handlers via 'handlers.register' calls in module app/realtime/handlers.py.

    """
    #see also django/utils/importlib.py 
    hotdotdir = getattr(settings, 'HOTDOT_DIRECTORY', 'realtime')
    hotdothandlers = getattr(settings, 'HOTDOT_HANDLES', 'handlers')
    modname = ".".join([app, hotdotdir, hotdothandlers]) # eg "testapp.one.realtime.handlers"
    print "modname => ", modname
    try:
        __import__(modname)
    except ImportError:
        pass


class Register(object):

    def __init__(self):
        self._registry = {} # maps Message types (msgtype) to Message Handler
        
    def __call__(self, name, handler_class):
        self._register(name, handler_class)
        print self._registry

    def _register(self, name, handler_class):
        """Register a handler to all messages with `name`.

        """
        if name in self._registry:
            raise AlreadyRegistered('The handler %s is already registered' % handler_class.__name__)

        # Instantiate the Handler class and save in registry
        self._registry[name] = handler_class() 

register = Register() #make a global instance


if __name__ == "__main__":

    __import__("testapp.one.realtime.handlers")
