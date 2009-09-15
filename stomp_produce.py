from time import time
from stompservice import StompClientFactory
from twisted.internet import reactor
from twisted.internet.task import LoopingCall

import simplejson as json

class ProduceData(StompClientFactory):
    """Push very simple test data to
    the STOMP JavaScript client.
    """

    def __init__(self, channel_name=None, push_interval=None):
        self.channel_name = channel_name
        self.push_interval = push_interval
 
    def recv_connected(self, msg):
        self.timer = LoopingCall(self.send_data)
        self.timer.start(self.push_interval)
       
    def send_data(self):
        data = json.dumps({"time":time()})
        self.send(self.channel_name, data)
