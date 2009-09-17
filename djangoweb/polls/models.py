from django.db import models
from django.contrib.auth.models import User

class Poll(models.Model):
    """A Poll with ChoiceA or ChoiceB and a Permissions system.

    `owner`: The User that creates the poll. Only User that can *delete* it.
    `collaborators`: Other Users that can *modify* the choices.
    `voters`: All Users that can *vote* (view). Empty implies *all Users*.

    TODO: Make `choice_a` and `choice_b` revisioned.
    """
    guid = models.CharField(max_length=32, unique=True, editable=False) #needs to be globally unique
    owner = models.ForeignKey(User)
    collaborators = models.ManyToManyField(User, blank=True, related_name='poll_collaborator')
    voters = models.ManyToManyField(User, blank=True, related_name='poll_voter')
    choice_a = models.CharField(max_length=100) 
    choice_b = models.CharField(max_length=100)
    pub_date = models.DateTimeField('date published')

class Vote(models.Model):
    """A User's Vote.
    """
    poll = models.ForeignKey(Poll)
    choice = models.BooleanField() # choice_a==1  choice_b==0
    votes = models.IntegerField() #allow more that one vote
