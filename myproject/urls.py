# =====================================================================
# HOMEQUEST AI - ROOT ROUTER (LIVE SYNC VERIFIED)
# =====================================================================
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('Accounts.urls')),
    path('api/properties/', include('Propertys.urls')),
    path('api/chatbot/', include('Chatbot.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
