"""
This script needs to:
    - find all INSTALLED_APPS
    - load all 'realtime.handlers'
    - deal with logging

    - create Django 'Twisted Service' (with opts: static files (MEDIA), etc)
    - create Orbited 'Twisted Service' (with opts: PORT, INTERFACE)
    - create Stomp (morbid) server
    - create 'RestQMessageProxy Service' using all 'realtime.handlers'

    - 'setServiceParent' of all Services, and run 'twistd'.

"""
import os
import sys
abspath = os.path.abspath("../../")
sys.path.append(abspath)
from django.core.management import setup_environ

from hotdot.handlers import activate_registration

if __name__ == "__main__":
    import settings
    env = setup_environ(settings)
    #print env print os.environ['DJANGO_SETTINGS_MODULE']
    for app in settings.INSTALLED_APPS:
        if not app.startswith("django."):
            activate_registration(app)
              
    
