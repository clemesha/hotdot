import os
import sys
from datetime import datetime

from twisted.cred import checkers, credentials, error
from zope.interface import implements

# Environment setup for your Django project files:
sys.path.append("djangoweb")
os.environ['DJANGO_SETTINGS_MODULE'] = 'djangoweb.settings'

from django.contrib.sessions.models import Session


class DatabaseChecker(object):
    implements(checkers.ICredentialsChecker)
    credentialInterfaces = (credentials.IUsernamePassword,)

    def requestAvatarId(self, creds):
        username = self._runQuery(username=creds.username, cookie=creds.password)
        if username is None: 
            return error.UnauthorizedLogin('Incorrect credentials')
        else:
            return username

    def _runQuery(self, username=None, cookie=None):
        """Check User permission based on Session.

        The Session Cookie is equivalent to a temporary
        password but has the benefit of avoiding exposing
        a User's real password, and has a limited lifetime.
        """
        #XXX run in deferToThread?
        try:
            session = Session.objects.get(session_key=cookie)
        except DoesNotExist:
            return None
        if session.expire_date > datetime.now():
            return username
        else:
            return None
