from .models import query
from django.http import HttpResponse
from django.urls import path
from django.urls import path
from . import views

urlpatterns = [
    path('load_filter_values/', views.load_filter_values, name='load_filter_values'),
    path('execute_query/', views.execute_query, name='execute_query'),
    path("load_more_query_rows/", views.load_more_query_rows, name="load_more_query_rows"),
    path('add_query/', views.add_query, name='add_query'),
    
]
