from django.http import HttpResponseRedirect, Http404
from django.shortcuts import render_to_response
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.conf import settings 

from polls.models import Poll, Vote
from polls.forms import PollForm
from polls.utility import create_poll_guid

from datetime import datetime
from hashlib import md5


#dont allow questions that are already url names:
DISALLOWED_QUESTIONS = ["", "new", "vote"]

@login_required
def index(request):
    users_polls = Poll.objects.filter(owner=request.user).order_by('-created_time')
    args = {"users_polls":users_polls, "user":request.user, }
    return render_to_response('polls/index.html', args)

@login_required
def poll(request, question):
    #XXX check if user is logged in, then enable chat, etc.
    question_guid = create_poll_guid(question)
    try:
        poll = Poll.objects.get(guid=question_guid)
    except Poll.DoesNotExist:
        raise Http404
    #XXX optimize queries:
    votes_a = Vote.objects.filter(poll__guid=question_guid, choice="a").count()
    votes_b = Vote.objects.filter(poll__guid=question_guid, choice="b").count()
    args = {"poll":poll, "votes_a":votes_a, "votes_b":votes_b, "user":request.user,
            "STOMP_PORT":settings.STOMP_PORT, "CHANNEL_NAME":question_guid, "HOST":settings.INTERFACE, 
            "SESSION_COOKIE_NAME":settings.SESSION_COOKIE_NAME}
    return render_to_response('polls/poll.html', args)


@login_required
def new(request):
    """
    Create a new Poll, with 1 initial "Pitch" for
    a given choice. The "Pitch" is a short blurb
    on why you should choice a given choice.

    The Pitch that the User fills out determines
    that User's choice for this particular Poll.

    TODO: Write Unit tests
    """
    if request.method == 'POST':
        form = PollForm(request.POST)
        if form.is_valid():
            pollinst = form.save(commit=False)
            pitch_a, pitch_b = form.cleaned_data["pitch_a"], form.cleaned_data["pitch_b"]
            if pitch_a == "" and pitch_b == "":
                    form.errors.extra = "Please write one Pitch"
            if pitch_a != "":
                if pitch_b != "":
                    form.errors.extra = "You can only write one Pitch."
                else: #pitch_a was written
                    vote_choice = 0 #pitch_a==0
            else:
                vote_choice = 1 #pitch_b==1
            question = form.cleaned_data["question"]
            if question in DISALLOWED_QUESTIONS:
                form.errors.extra = "Invalid Question, please try a different one."
            if not hasattr(form.errors, "extra"):
                pollinst.owner = request.user
                pollinst.last_modified = datetime.now()
                pollinst.guid = create_poll_guid(question)
                try:
                    pollinst.save()
                    newvote = Vote(poll=pollinst, choice=vote_choice, voter=request.user)
                    newvote.save()
                    return HttpResponseRedirect('/polls/') # Redirect after POST
                except IntegrityError:
                    form.errors.extra = "Your Question already exists, possibly created by another User."
    else:
        form = PollForm()
    args = {'form':form}
    return render_to_response('polls/new.html', args)

