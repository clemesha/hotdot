from polls.models import Poll, Vote
from django.contrib import admin

class PollAdmin(admin.ModelAdmin):
    list_display = ('question', 'owner', 'pitch_a', 'pitch_b', 'last_modified', 'created_time')

admin.site.register(Poll, PollAdmin)

class VoteAdmin(admin.ModelAdmin):
    #list_display = ('poll__question', 'choice', 'poll__pitch_a', 'poll__pitch_b', 'voter')
    list_display = ('choice', 'voter')

admin.site.register(Vote, VoteAdmin)

