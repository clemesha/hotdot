from django.template import Context, loader
from django.http import HttpResponse, HttpResponseRedirect
from django.db import IntegrityError

from polls.models import Poll, Vote
from polls.forms import PollForm

from datetime import datetime
from hashlib import md5


def index(request):
    users_polls = Poll.objects.filter(owner=request.user).order_by('-created_time')
    t = loader.get_template('polls/index.html')
    c = Context({'users_polls':users_polls})
    return HttpResponse(t.render(c))

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
                    form.errors.extra = "You can only write one Pitch"
                else: #pitch_a was written
                    vote_choice = 0 #pitch_a==0
            else:
                vote_choice = 1 #pitch_b==1
            if not hasattr(form.errors, "extra"):
                pollinst.owner = request.user
                pollinst.last_modified = datetime.now()
                pollinst.guid = md5(form.cleaned_data["question"]).hexdigest()
                try:
                    pollinst.save()
                    newvote = Vote(poll=pollinst, choice=vote_choice, voter=request.user)
                    newvote.save()
                    return HttpResponseRedirect('/polls') # Redirect after POST
                except IntegrityError:
                    form.errors.extra = "Your Question already exists, possibly created by another User."
    else:
        form = PollForm()
    t = loader.get_template('polls/new.html')
    c = Context({'form':form})
    return HttpResponse(t.render(c))


