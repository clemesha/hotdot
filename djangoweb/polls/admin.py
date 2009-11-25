from polls.models import Poll, Vote, Pitch, PitchEditRevision
from django.contrib import admin

class PollAdmin(admin.ModelAdmin):
    list_display = ('question', 'owner', 'last_modified', 'created_time')
admin.site.register(Poll, PollAdmin)

class PitchAdmin(admin.ModelAdmin):
    list_display = ('poll', 'content', 'choice_id', 'editor', 'edit_time')
admin.site.register(Pitch, PitchAdmin)

class PitchEditRevisionAdmin(admin.ModelAdmin):
    list_display = ('poll_guid', 'content', 'editor', 'edit_time')
admin.site.register(PitchEditRevision, PitchEditRevisionAdmin)

class VoteAdmin(admin.ModelAdmin):
    list_display = ('pitch', 'choice', 'voter', 'vote_time')
admin.site.register(Vote, VoteAdmin)

