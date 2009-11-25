from django.forms import ModelForm

from polls.models import Poll, Pitch


class PollForm(ModelForm):
    class Meta:
        model = Poll
        fields = ["question"]

class PitchForm(ModelForm):
    class Meta:
        model = Pitch
        fields = ["content"] #, "pitch_a", "pitch_b"]
