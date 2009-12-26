import os
import sys
abspath = os.path.abspath("../")
print abspath
sys.path.append(abspath)
from hotdot import handlers

#from hotdot.handlers import BaseHandler
#from hotdot.handlers import register


class OneHandler(handlers.BaseHandler):

    def send(self, msg, *args, **kwargs):
        username = kwargs.get("username")
        msg.update({"username":username})
        return msg


handlers.register("one", OneHandler) # register OneHandler to messages with type 'one'
