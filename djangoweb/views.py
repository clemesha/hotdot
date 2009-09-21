from django.shortcuts import render_to_response
from django.contrib.auth.decorators import login_required
from django.conf import settings 

@login_required
def index(request):
    args = {"user":request.user, "STOMP_PORT":settings.STOMP_PORT, "CHANNEL_NAME":settings.CHANNEL_NAME, 
           "HOST":settings.INTERFACE, "SESSION_COOKIE_NAME":settings.SESSION_COOKIE_NAME}
    return render_to_response('index.html', args)
