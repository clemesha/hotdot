import unittest
from datetime import datetime
from django.contrib.auth.models import User
from polls.models import Poll
from polls.utility import create_poll_guid

class PollCreateTestCase(unittest.TestCase):
    def setUp(self):
        self.user = User(username="test_user", password="test_password")
        self.user.save()
        self.question = "Is Foo the new bar??"
        self.pitch = "Foo is better!"
        self.guid = create_poll_guid(self.question)
        self.poll = Poll(guid=self.guid, owner=self.user, question=self.question, pitch_a=self.pitch, last_modified=datetime.now())
        self.poll.save()

    def testGetPoll(self):
        testslug = "is-foo-the-new-bar"
        testguid = create_poll_guid(testslug)
        getpoll = Poll.objects.get(guid=testguid)
        self.assertEquals(self.question, getpoll.question)
        self.assertEquals(self.user, getpoll.owner)
        self.assertEquals(self.pitch, getpoll.pitch_a)
        self.assertEquals("", getpoll.pitch_b)

