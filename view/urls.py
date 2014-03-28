from django.conf.urls import patterns, url

from view import views

urlpatterns = patterns('',
    url(r'^$', views.index, name='index'),
)
