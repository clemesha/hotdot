######################################################################### 
# Copyright (C) 2009, 2010 Alex Clemesha <alex@clemesha.org>
# 
# This module is part of Hotdot, and is distributed under the terms 
# of the BSD License: http://www.opensource.org/licenses/bsd-license.php
#########################################################################
"""
Handlers that inspect, log, and modify
in-transit Orbited messages.

This file is very application specific,
so there needs to be a clear way to:

    1. Create custom message handlers
    2. Overide of message handlers
    3. "Plug in" custom message handlers


"""
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

# TODO
# take all below functions and put into an base class and subclass:
# Make 'logging' of all message tunable
# Have base-class use  'getattr' in combination with 'msgtype'.
# to get the appropiate message handler.
def handle_send(msg, username, channel_id):
    msg = json.loads(msg)
    msg.update({"from":username})
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
    if choice not in ["a", "b"]: #TODO make configurable.
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
    pitch = Pitch.objects.get(poll__guid=channel_id, choice_id=choice)
    if pitch is None:
        return {"error":"No such pitch"}
    user = User.objects.get(username=username)
    if user is None:
        return {"error":"No such user"}
    pitch.content = content
    pitch.editor = user
    pitch.save()
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


MESSAGE_HANDLERS = {
    "send":handle_send,
    "subscribe":handle_subscribe,
    "connect":handle_connect,
    "disconnect":handle_disconnect
}
