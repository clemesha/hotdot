from django.db import models
from django.contrib.auth.models import User

class Poll(models.Model):
    """A Poll with Pitches.

    `owner`: The User that creates the poll. Only User that can *delete* it.

    TODO: Make the `pitchs` revisioned.
    """
    guid = models.CharField(max_length=32, unique=True) #md5 hash of `question.lower()`
    owner = models.ForeignKey(User) #User who created Poll
    question = models.CharField(max_length=140) 
    created_time = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)

class Pitch(models.Model):
    poll = models.ForeignKey(Poll)
    content = models.CharField(max_length=140, blank=True)
    choice_id = models.CharField(max_length=1) #Currently either 'a' or 'b'
    editor = models.ForeignKey(User) #User who edited Poll
    edit_time = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("poll", "choice_id"),)

    def save(self, *args, **kwargs):
        """Save a Revisioned copy after the real save.
        """
        super(Pitch, self).save(*args, **kwargs) 
        new_revision = PitchEditRevision()
        new_revision.poll_guid=self.poll.guid 
        new_revision.content=self.content 
        new_revision.editor=self.editor
        new_revision.edit_time=self.edit_time
        new_revision.save()

    def delete(self):
        """Delete all Revisions that are associated
        with this Pitche's Poll via 'self.poll.guid'.
        """
        super(Pitch, self).delete() 
        revs = PitchEditRevision.objects.filter(poll_guid=self.poll.guid)
        for rev in revs:
            rev.delete()

    def vote(self, choice=None, voter=None):
        if choice is None:
            choice = self.choice_id
        if voter is None:
            voter = self.editor
        new_vote = Vote(pitch=self, choice=choice, voter=voter)
        new_vote.save()
        

class PitchEditRevision(models.Model):
    """Snapshot of the current Pitch state
    """
    poll_guid = models.CharField(max_length=32)
    content = models.CharField(max_length=140, blank=True)
    editor = models.ForeignKey(User) #User who edited Poll
    edit_time = models.DateTimeField()

    class Meta:
        ordering = ("-edit_time",)        


class Vote(models.Model):
    """A User's Vote.

    Need to store current Pitch id because
    Pitches can change over time.
    """
    pitch = models.ForeignKey(Pitch)
    choice = models.CharField(max_length=1)
    voter = models.ForeignKey(User) #TODO: can be Anonymous.
    vote_time = models.DateTimeField(auto_now=True)
