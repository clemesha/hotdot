from hashlib import md5
from django.template.defaultfilters import slugify

def create_poll_guid(question):
    question = slugify(question)
    return md5(question).hexdigest()
