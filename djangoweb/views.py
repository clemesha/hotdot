from django.shortcuts import render_to_response
from django.conf import settings 

def index(request):
    args = {"STOMP_PORT":settings.STOMP_PORT, "CHANNEL_NAME":settings.CHANNEL_NAME, "HOST":settings.INTERFACE}
    return render_to_response('index.html', args)


