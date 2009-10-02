from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

from views import index

urlpatterns = patterns('',
    (r'^$', index),
    (r'^polls/', include('djangoweb.polls.urls')),
    (r'^accounts/', include('djangoweb.registration.urls')),
    (r'^admin/(.*)', admin.site.root),
)
