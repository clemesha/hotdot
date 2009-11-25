from django.http import HttpResponseRedirect, Http404
from django.shortcuts import render_to_response
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.conf import settings 

from polls.models import Poll, Vote, Pitch
from polls.forms import PollForm, PitchForm
from polls.utility import create_poll_guid

from datetime import datetime
from hashlib import md5


#dont allow questions that are already url names:
DISALLOWED_QUESTIONS = ["", "new", "vote"]

@login_required
def poll(request, question):
    #TODO: check if user is logged in, then enable chat, etc.
    question_guid = create_poll_guid(question)
    try:
        poll = Poll.objects.get(guid=question_guid)
    except Poll.DoesNotExist:
        raise Http404
    #TODO optimize queries:
    votes_a = Vote.objects.filter(pitch__poll__guid=question_guid, choice="a").count()
    votes_b = Vote.objects.filter(pitch__poll__guid=question_guid, choice="b").count()
    pitch_a,_ = Pitch.objects.get_or_create(poll=poll, choice_id="a", defaults={"content":"", 'editor':request.user})
    pitch_b,_ = Pitch.objects.get_or_create(poll=poll, choice_id="b", defaults={"content":"", 'editor':request.user})
    args = {"poll":poll, "pitch_a":pitch_a, "pitch_b":pitch_b, "votes_a":votes_a, "votes_b":votes_b, 
            "user":request.user, "STOMP_PORT":settings.STOMP_PORT, "CHANNEL_NAME":question_guid, 
            "HOST":settings.INTERFACE, "SESSION_COOKIE_NAME":settings.SESSION_COOKIE_NAME}
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
        poll_form = PollForm(request.POST)
        pitch_form = PitchForm(request.POST)
        if poll_form.is_valid() and pitch_form.is_valid():
            poll_inst = poll_form.save(commit=False)
            question = poll_form.cleaned_data["question"]
            if question in DISALLOWED_QUESTIONS:
                poll_form.errors.extra = "Invalid Question, please try a different one."
            if not hasattr(poll_form.errors, "extra"):
                poll_inst.owner = request.user
                poll_inst.last_modified = datetime.now()
                poll_inst.guid = create_poll_guid(question)
                try:
                    poll_inst.save()
                    #TODO add a function to Pitch to make this cleaner:
                    pitch_inst = pitch_form.save(commit=False)
                    pitch_inst.poll = poll_inst
                    pitch_inst.choice_id = "a"
                    pitch_inst.editor = poll_inst.owner
                    pitch_inst.save()
                    pitch_inst.vote()
                    return HttpResponseRedirect('/') # Redirect after POST
                except IntegrityError:
                    poll_form.errors.extra = "Your Question already exists, possibly created by another User."
    else:
        poll_form = PollForm()
        pitch_form = PitchForm()
    args = {"poll_form":poll_form, "pitch_form":pitch_form, "user":request.user}
    return render_to_response("polls/new.html", args)

