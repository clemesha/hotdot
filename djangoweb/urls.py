import os
from django.conf.urls.defaults import *
from django.contrib import admin
admin.autodiscover()

from django.conf import settings 

from polls.models import Poll

index_info_dict = {
    'recent_polls':Poll.objects.order_by("-last_modified").all(),
}

urlpatterns = patterns('',
    (r'^$', 'django.views.generic.simple.direct_to_template', {'template':'index.html', 'extra_context':index_info_dict}),
    (r'^polls/', include('djangoweb.polls.urls')),
    (r'^accounts/', include('djangoweb.registration.urls')),
    (r'^admin/(.*)', admin.site.root),
)

if settings.DEBUG:
    print os.path.join(settings.PROJECT_PATH, 'static')
    urlpatterns += patterns('',
        (r'^static/(.*)', 'django.views.static.serve', {'document_root': os.path.join("../", 'static')}),
)

