import os
import sys
# Environment setup for your Django project files:
sys.path.append("djangoweb")
os.environ['DJANGO_SETTINGS_MODULE'] = 'djangoweb.settings'

from django.contrib.auth.models import User
from djangoweb.polls.models import Poll, Vote, Pitch


try:
    # 2.6 will have a json module in the stdlib
    import json
except ImportError:
    try:
        # simplejson is the thing from which json was derived anyway...
        import simplejson as json
    except ImportError:
        print "No suitable json library found, see INSTALL.txt"

#TODO: Generalize the:
# 1) Creation of message handlers
# 2) Overiding of message handlers
# 3) "Plug in" configurable/custom message handlers


def handle_send(msg, username, channel_id):
    msg = json.loads(msg)
    msgtype = msg.get("type")
    if msgtype is None:
        update = {"error":"Missing message type"}
    if msgtype == "chat":
        update = {"from":username}
    if msgtype == "edit":
        content = msg.get("content")
        choice = msg.get("choice") #Pitch 'a' or 'b'
        update = _handle_edit(content, choice, username, channel_id)
    if msgtype == "vote":
        choice = msg.get("choice")
        update = _handle_vote(choice, username, channel_id)
    #update the message with type specific response info:
    msg.update(update)
    return msg

def _handle_vote(choice, username, channel_id):
    """Insert a new Vote for this User.

    TODO: optimize queries. Probably by hiting
    cache, or by doing less queries here.
    """
    user = User.objects.get(username=username)
    if user is None:
        return {"error":"No such user"}
    if choice not in ["a", "b"]: #XXX make configurable?
        return {"error":"Invalid choice"}
    pitch = Pitch.objects.get(poll__guid=channel_id, choice_id=choice)
    if pitch is None:
        return {"error":"No such poll"}
    pitch.vote()
    return {"choice":choice, "username":username}


def _handle_edit(content, choice, username, channel_id):
    """Handle the edit of a Poll's Pitch by a User.

    TODO: Use more efficient diff algorithms/storage.
    """
    poll = Poll.objects.get(guid=channel_id)
    if poll is None:
        return {"error":"No such poll"}
    user = User.objects.get(username=username)
    if user is None:
        return {"error":"No such user"}
    if pitch not in ["a", "b"]: #XXX make configurable?
        return {"error":"Invalid choice"}
    newvote = Vote(poll=poll, choice=choice, voter=user)
    newvote.save()
    return {"choice":choice, "content":content}


def handle_subscribe(msg, username, channel_id):
    print "=handle_subscribe= ", msg, username, channel_id
    return msg

def handle_connect(msg, username, channel_id):
    print "=handle_connect= ", msg, username, channel_id
    return msg

def handle_disconnect(msg, username, channel_id):
    print "=handle_disconnect= ", msg, username, channel_id
    return msg


HANDLERS = {
    "send":handle_send,
    "subscribe":handle_subscribe,
    "connect":handle_connect,
    "disconnect":handle_disconnect
}





