from twisted.cred import portal, checkers, credentials
from twisted.internet.protocol import Factory
from zope.interface import Interface, implements

from morbid import StompProtocol
from morbid.restq import RestQ
from morbid import messagequeue
from morbid.mqsecurity import MQRealm, MQDefaultParms, IConnector


class DatabaseChecker(object):
    implements(checkers.ICredentialsChecker)
    credentialInterfaces = (credentials.IUsernamePassword,)

    def requestAvatarId(self, creds):
        print "--- requestAvatarId ---", creds.username, creds.password
        ###
        #XXX do database call here.
        ###
        return creds.username

def get_stomp_factory():
    parms = MQDefaultParms() #Could subclass to add config opts
    stomp_portal = StompPortalCustom(MQRealm(parms))
    checker = DatabaseChecker()
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
        print "----- kw ---- ", kw
        print "In stomp_login", kw.get("login","None"), kw.get("passcode", "None")
        creds = credentials.UsernamePassword(kw.get("login", ""),
                                            kw.get("passcode", ""))
        d = self.login(creds, None, IConnector)
        print "Stomp_login d = ", d
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
        self.restq = RestQ(rqaddr)
        self.verbose = verbose
        if mqm:
            self.mqm = mqm
        else:
            self.mqm = messagequeue.MessageQueueManager()
        self.mq_portal = portal #mqsecurity.MQPortal(self.mqm, filename=filename)
        self.mqm.set_queue_rights(parms.get_group_access_rights())
        self.mq_portal.mqm = self.mqm

    def report(self, msg):
        if self.verbose:
            print "[%s] MorbidQ: %s"%(datetime.now(), msg)

    def disconnected(self, proto):
        self.mqm.unsubscribe_all_queues(proto)


