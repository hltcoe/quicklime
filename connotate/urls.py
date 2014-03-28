from django.conf.urls import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'connotate.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^$', 'view.views.index', name='index'),
    url(r'^view/', include('view.urls')),
    url(r'^admin/', include(admin.site.urls)),
)
