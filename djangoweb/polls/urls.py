from django.conf.urls.defaults import *

from polls.views import poll, new 

urlpatterns = patterns('',
    url(r'^new$', new, name='new'),
    url(r'^(?P<question>.*)$', poll, name='poll'),
)

