from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

from views import index

urlpatterns = patterns('',
    (r'^$', index),
    (r'^/polls$', 'djangoweb.polls.views.index'),
    (r'^polls/(?P<poll_id>\d+)/$', 'djangoweb.polls.views.detail'),
    #(r'^polls/(?P<poll_id>\d+)/results/$', 'djangoweb.polls.views.results'),
    #(r'^polls/(?P<poll_id>\d+)/vote/$', 'djangoweb.polls.views.vote'),
    (r'^accounts/', include('djangoweb.registration.urls')),
    # Uncomment the next line to enable the admin:
    (r'^admin/(.*)', admin.site.root),
)
