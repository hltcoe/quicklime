from django.conf.urls import patterns, url

from quicklime import views

urlpatterns = patterns('',
    url(r'^$', views.index, name='index'),
    url(r'^as_json/$', views.as_json, name='as_json'),
)