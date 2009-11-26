from datetime import datetime

from twisted.cred import portal, credentials
from twisted.internet.protocol import Factory

from restq import RestQ
from morbid import StompProtocol
from morbid.messagequeue import MessageQueueManager
from morbid.mqsecurity import MQRealm, MQDefaultParms, IConnector

import auth

def get_stomp_factory():
    parms = MQDefaultParms() #Could subclass to add config opts
    stomp_portal = StompPortalCustom(MQRealm(parms))
    checker = auth.DatabaseChecker()
    stomp_portal.registerChecker(checker)
    stomp_factory = StompFactoryCustom(portal=stomp_portal, parms=parms)
    return stomp_factory


class StompPortalCustom(portal.Portal):
    """Need to subclass Portal because of the
    dependance of 'self.factory.mq_portal.stomp_login' in
    the class StompProtocol in file morbid.py

    """

    def __init__(self, realm):
        portal.Portal.__init__(self, realm)

    def stomp_login(self, **kw):
        #XXX use 'username, cookie'.
        username, password = kw.get("login", ""), kw.get("passcode", "")
        creds = credentials.UsernamePassword(username, password)
        d = self.login(creds, None, IConnector)
        return d

class StompFactoryCustom(Factory):
    """
    A custom StompFactory that allows any Portal.

    The StompFactory creates an instance of a StompProtocol for each connection.
    Successful authentication results in the creation of an avatar for that user.
    The Avatar is assigned to the StompProtocol.
    """
    protocol = StompProtocol

    def __init__(self, mqm=None, portal=None, parms=None, rqaddr=None, verbose=False):
        self.id = 0
        self.restq = RestQ() #(rqaddr)
        self.verbose = verbose
        if mqm:
            self.mqm = mqm
        else:
            from mqm import MessageQueueManager #XXX for debugging
            self.mqm = MessageQueueManager()
        self.mq_portal = portal #mqsecurity.MQPortal(self.mqm, filename=filename)
        self.mqm.set_queue_rights(parms.get_group_access_rights())
        self.mq_portal.mqm = self.mqm

    def report(self, msg):
        if self.verbose:
            print "[%s] MorbidQ: %s"%(datetime.now(), msg)

    def disconnected(self, proto):
        self.mqm.unsubscribe_all_queues(proto)

