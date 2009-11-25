import unittest
from django.contrib.auth.models import User
from django.db import IntegrityError
from polls.models import Pitch, Poll, Vote, PitchEditRevision
from polls.utility import create_poll_guid

class PollCreateTestCase(unittest.TestCase):
    def setUp(self):
        self.user = User.objects.create_user("user1", "user1@example.com", password="password1")
        self.user.save()
        
        self.second_user = User.objects.create_user("user2", "user2@example.com", password="password2")
        self.second_user.save()

        self._question = "Is Foo the new Bar?"
        self._guid = create_poll_guid(self._question)
        self._choice = "a"
        self._content = "No, Foo will always be tops!"

        self.poll = Poll(guid=self._guid, owner=self.user, question=self._question)
        self.poll.save()

        self.pitch = Pitch(poll=self.poll, content=self._content, choice_id=self._choice, editor=self.user)
        self.pitch.save()
        self.pitch.vote() #User who creates Pitch automatically Votes for it.

    def tearDown(self):
        for user in User.objects.all():
            user.delete()

    def test_newDuplicatePitch(self):
        """Creating a new Pitch for an existing Poll 
        with the same 'choice_id' should fail.
        """
        self.pitch = Pitch(poll=self.poll, content=self._content, choice_id=self._choice, editor=self.user)
        try:
            self.pitch.save()
        except IntegrityError:
            return True

    def test_GetPoll(self):
        testslug = "is-foo-the-new-bar"
        testguid = create_poll_guid(testslug)
        poll = Poll.objects.get(guid=testguid)
        pitch = poll.pitch_set.get(editor=self.user)
        self.assertEquals(self._question, poll.question)
        self.assertEquals(self.user, poll.owner)
        self.assertEquals(self._content, pitch.content)

    def test_AddNewPitchbyNewUser(self):
        getpoll = Poll.objects.get(guid=self._guid)
        new_pitch = Pitch(poll=getpoll, editor=self.second_user, content="Bar will rise and defeat Foo!")
        new_pitch.save()
        #print getpoll.pitch_set.all()

    def test_VoteForPitch(self):
        pitch = Pitch.objects.get(poll__guid=self._guid, choice_id="a")
        pitch.vote()

    def test_editPitch(self):
        pitch = Pitch.objects.get(poll__guid=self._guid, choice_id="a")
        pitch.content = "Foo is best eva."
        pitch.save()
        revs = PitchEditRevision.objects.all()
        self.assertEquals(len(revs), 2)
        self.assertEquals(revs[0].content, pitch.content)
        self.assertEquals(revs[1].content, self._content)
