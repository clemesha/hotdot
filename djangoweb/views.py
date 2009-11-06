from django.shortcuts import render_to_response
from django.contrib.auth.decorators import login_required
from django.conf import settings 

from polls.models import Poll

def index(request):
    recent_polls = Poll.objects.order_by("-last_modified")  #limit returned?
    if request.user.is_authenticated():
        users_polls = Poll.objects.filter(owner=request.user).order_by("-created_time") #limit returned?
    else:
        users_polls = []
    args = {"users_polls":users_polls, "recent_polls":recent_polls, "user":request.user}
    return render_to_response("index.html", args)

