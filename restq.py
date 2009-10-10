from twisted.internet import defer
from twisted.web import resource
from twisted.web.client import getPage

import simplejson as json


PORT=5000
CB_URLS = {
    'connect':'http://localhost:%s/connect'%PORT,
    'disconnect':'http://localhost:%s/disconnect'%PORT,
    'subscribe':'http://localhost:%s/subscribe'%PORT,
    'unsubscribe':'http://localhost:%s/unsubscribe'%PORT,
    'send':'http://localhost:%s/send'%PORT
}

class RestQ(object):
    def __init__(self, port=5000, rqaddr='http://localhost:%s'):
        pass
        #if rqaddr:
        #    getPage(rqaddr).addCallback(self.initialize).addErrback(eb(rqaddr))
    
    def _error(self, error):
        print "!!!!!!!! RestQ error ==== ", error

    def _success(self, raw_data, headers, body):
        data = json.loads(raw_data)
        if "allow" in data and data["allow"] == "no":
            return (data, None)
        newBody = data.get('body',body)
        headers['content-length'] = len(newBody)
        if "autosubscribe" in data:
            conn.autosubscribe(data['autosubscribe'])
        if "autounsubscribe" in data:
            conn.autounsubscribe(data['autounsubscribe'])
        return (headers, newBody)


    def submit(self, conn, cmd, headers={}, body=""):
        url = CB_URLS.get(cmd, None)
        print "***************** RestQ submit=> ", url, conn, cmd, headers, body
        if url is not None:
            headers["username"] = conn.username
            if cmd == "send":
                headers['body'] = body
            data = json.dumps(headers)
            d = getPage(url, method='POST', postdata=data)
            d.addCallback(self._success, headers, body).addErrback(self._error)
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
    
    def __init__(self, cbUrls={}):
        resource.Resource.__init__(self)
        self.cbUrls = cbUrls

    def getChild(self, path, request):
        print "RRRRRRRRRRRRRRRRRRRRR QQQQQQQQQQQQQQQQ ", path, request
        if not path or path == "/":
            return Render(CB_URLS)
        content = json.loads(request.content.read())
        print "CCCCCCCCCCCCCC => ", content
        username = content['username']
        destination = content.get("destination", None)
        print "MMMMMMPPP ", content, username, destination
        return Render(content)

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


