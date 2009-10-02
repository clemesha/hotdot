from django.conf.urls.defaults import *

from polls.views import index, poll, new 

urlpatterns = patterns('',
    url(r'^$', index, name='index'),
    url(r'^new$', new, name='new'),
    url(r'^(?P<question>.*)$', poll, name='poll'),
)

