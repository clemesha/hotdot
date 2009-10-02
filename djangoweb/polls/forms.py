from django.forms import ModelForm

from polls.models import Poll


class PollForm(ModelForm):
    class Meta:
        model = Poll
        fields = ["question", "pitch_a", "pitch_b"]
