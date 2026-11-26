from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

User = get_user_model()


class EmailOrUsernameBackend(ModelBackend):
    """
    Custom authentication backend that allows users to authenticate
    using either their username OR their email address (case-insensitive).
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('email')

        if not username or not password:
            return None

        clean_credential = str(username).strip()

        try:
            # Query by either username or email (case-insensitive)
            user = User.objects.filter(
                Q(username__iexact=clean_credential) | Q(email__iexact=clean_credential)
            ).first()
        except Exception:
            return None

        if user and user.check_password(password):
            # If user was inactive, we can check user_can_authenticate
            if self.user_can_authenticate(user):
                return user
        return None
