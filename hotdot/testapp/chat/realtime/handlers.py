import os
import sys
abspath = os.path.abspath("../")
sys.path.append(abspath)
from hotdot import handlers

#from hotdot.handlers import BaseHandler
#from hotdot.handlers import register


class ChatHandler(handlers.BaseHandler):

    def send(self, msg, *args, **kwargs):
        username = kwargs.get("username")
        msg.update({"from":username})
        return msg


handlers.register("chat", ChatHandler) 
