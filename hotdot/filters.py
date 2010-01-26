from twisted.web import resource

class MessageIntermediary(object):
    """Maps specific message type to custom handler.


    Example:
        Given a django app 'chat', with corresponding
        hotdot message handlers from 'app/chat/realtime/handlers.py'
        'handler_registry' is populated with methods from a subclass 
        of 'handlers.BaseHandler'

    """

    def __init__(self, handler_registry):
        self.handler_registry = handler_registry

    def handle_event(self, event, msg, **kwargs):
        """
        Handle a event, which is one of:
            ('connect', 'disconnect', 'subscribe', 'unsubscribe', 'send')

        """
        msgtype = msg.type("type")
        if msgtype is None:
            raise #make clear/specific error
        handler = getattr(self.handler_registry[msgtype], event, None)
        if handler is None:
            raise #make clear/specific error
        newmsg = handler(msg)
        
        

class MessageIntermediaryResource(MessageIntermediary, resource.Resource):

    def getChild(self, path, request):
        content = json.loads(request.content.read())
        msg = content["body"]
        username = content["username"]
        destination = content.get("destination")
        channel_id = None
        if destination is not None:
            channel_id = destination.split("/")[-1]
        self.handle_event(path, msg, username=username, destination=destination, channel_id=channel_id)
