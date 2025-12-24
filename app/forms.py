from django import forms
from .models import query

class QueryForm(forms.ModelForm):
    class Meta:
        model = query
        fields = ['query_name', 'query_text']