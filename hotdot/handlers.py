"""
Get all message handlers from all apps
that contain a subdirectory 'realtime'.

Load all functions in file?
OR
Require specifying of desired functions.

"""

HANDLERS = ['connect', 'disconnect', 'subscribe', 'unsubscribe', 'send']


# register 

#TODO: when this is called with some django-admin func,
# use normal method to find INSTALLED_APPS

TEST_INSTALLED_APPS = ('testapp.one', 'testapp.two')

WARN_MISSING = True #warn if some message handlers are missing. Configure silent/verbose from cmd line

def register_handlers():
    for app in TEST_INSTALLED_APPS:
        # split on '.', take last as 'app' name.
        #... #find handlers file
        #... #extra all functions. Special names?
        pass

def get_handlers(handler_module):
    for handler in HANDLERS:
        try:
            print handler
            exec("from %(handler_module)s import %(handler)s" % locals())
        except ImportError:
            exec("%(handler)s = None" % locals())
    return locals()


def register_logging():
    """
    function.log == True || function.log is callable
    default is False. If function.log == True, using Python logging. Allow custom logging is funcion.log is callable.
    """
    #for each handler function, see if:
    pass

def logging_passthrough(args=None, kwargs=None):
    """
    For when logging is not needed.
    """
    pass



if __name__ == "__main__":

    def test_get_handlers():
        mod = "testapp.one.handlers"
        return get_handlers(mod)

    print test_get_handlers()
