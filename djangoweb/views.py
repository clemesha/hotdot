from django.shortcuts import render_to_response
from django.contrib.auth.decorators import login_required
from django.conf import settings 

@login_required
def index(request):
    args = {"STOMP_PORT":settings.STOMP_PORT, "CHANNEL_NAME":settings.CHANNEL_NAME, "HOST":settings.INTERFACE}
    args.update({"user":request.user})
    return render_to_response('index.html', args)
