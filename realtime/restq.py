from twisted.internet import defer
from twisted.web import resource
from twisted.web.client import getPage

try:
    # 2.6 will have a json module in the stdlib
    import json
except ImportError:
    try:
        # simplejson is the thing from which json was derived anyway...
        import simplejson as json
    except ImportError:
        print "No suitable json library found, see INSTALL.txt"

class RestQ(object):
    def __init__(self, port=5000, rqaddr='http://localhost', handlers=None):
        if handlers is None:
            self.handlers = ['connect', 'disconnect', 'subscribe', 'unsubscribe', 'send']
        else:
            self.handlers = handlers
        self.callback_urls = dict([(handler, "%s:%d/%s" % (rqaddr, port, handler)) for
                             handler in self.handlers])
        #if rqaddr:
        #    getPage(rqaddr).addCallback(self.initialize).addErrback(eb(rqaddr))

    def _error(self, error):
        print "!!! RestQ error ====> ", error

    def _success(self, raw_data, conn, headers, body):
        data = json.loads(raw_data)
        print " RestQ _success ====> ", data
        #if "allow" in data and data["allow"] == "no":
        #    return (data, None)
        #newBody = data.get('body', body)
        newBody = raw_data #XXX get('body', body)
        headers['content-length'] = len(newBody)
        """
        if "autosubscribe" in data:
            conn.autosubscribe(data['autosubscribe'])
        if "autounsubscribe" in data:
            conn.autounsubscribe(data['autounsubscribe'])
        """
        return (headers, newBody)


    def submit(self, conn, cmd, headers={}, body=""):
        url = self.callback_urls.get(cmd, None)
        print "** RestQ.submit (cmd || headers || body) => ", cmd, "||", headers, "||", body
        if url is not None:
            headers["username"] = conn.username
            if cmd == "send":
                headers["body"] = body
            data = json.dumps(headers)
            d = getPage(url, method='POST', postdata=data)
            d.addCallback(self._success, conn, headers, body).addErrback(self._error)
            if cmd in ["connect", "subscribe", "send"]:
                return d
        return defer.succeed((headers, body))

    def initialize(self, rawData):
        data = json.loads(rawData)
        for key, value in data.items():
            self.cbs[key] = value


# The below class is motivated by the
#'RestQ' monitoring discussion here:
# http://orbited.org/wiki/Monitoring
class RestQMessageProxy(resource.Resource):
    """Message Proxy that has the ability to inspect
    and/or modify Messages before the reach their
    final destination.

    TODO: standize a set of message attributes,
    such as 'type' and 'from'.
    """

    def __init__(self, handlers=None):
        resource.Resource.__init__(self)
        from message_handlers import MESSAGE_HANDLERS
        self.handlers = MESSAGE_HANDLERS

    def getChild(self, path, request):
        print "RestQMessageProxy.getChild (path, request) => ", path, request
        if not path or path == "/":
            return Render("No such message proxy handler")
        content = json.loads(request.content.read())
        msg, channel_id = content, None
        username, destination = content['username'], content.get("destination")
        if "body" in content:
            msg = content["body"]
        if destination is not None:
            channel_id = destination.split("/")[-1]
        new_msg = self.handlers[path](msg, username, channel_id)
        print "RestQMessageProxy.getChild (path, new_message) => ", path, new_msg
        return Render(new_msg)

class Render(object):
    def __init__(self, data):
        self.data = data

    def render(self, request):
        return json.dumps(self.data)


"""
        if path in cbUrls:
            print 'checking path: "%s"'%(path,)
            if path == "connect":
                if username == "noconnect":
                    return wrap({"allow":"no"})
            elif path == "send":
                newBody = headers['body'].replace("apples","bananas")
                if username == 'nosend':
                    return wrap({"allow":"no"})
                elif username == 'slow':
                    time.sleep(1)
                return wrap({"body":newBody})
            elif path == "subscribe":
                if destination == "auto":
                    return wrap({"autosubscribe":["room1","room2","room3"]})
            elif path == "unsubscribe":
                if destination == "auto":
                    return wrap({"autounsubscribe":["room1","room2","room3"]})
            return wrap({})
"""


