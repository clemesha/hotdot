from django.db import models
from django.contrib.auth.models import User

class Poll(models.Model):
    """A Poll with Pitches.

    `owner`: The User that creates the poll. Only User that can *delete* it.

    TODO: Make the `pitchs` revisioned.
    """
    guid = models.CharField(max_length=32, unique=True, editable=False) #md5 hash of `question`
    owner = models.ForeignKey(User) #User who created Poll
    question = models.CharField(max_length=140) 
    pitch_a = models.CharField(max_length=140) 
    pitch_b = models.CharField(max_length=140)
    created_time = models.DateTimeField(auto_now=True)
    last_modified = models.DateTimeField()

class Vote(models.Model):
    """A User's Vote.
    """
    poll = models.ForeignKey(Poll)
    choice = models.BooleanField() # pitch_a==0  pitch_b==1
    voter = models.ForeignKey(User) #User who voted, can be Anonymous.
    
