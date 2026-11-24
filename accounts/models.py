from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **fields):
        if not email:
            raise ValueError("Informe um e-mail.")
        user = self.model(email=email.strip().lower(), **fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **fields):
        fields.setdefault("is_staff", True)
        fields.setdefault("is_superuser", True)
        if not fields["is_staff"] or not fields["is_superuser"]:
            raise ValueError("Privilégios administrativos obrigatórios.")
        return self.create_user(email, password, **fields)


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    theme = models.CharField(
        max_length=8,
        default="system",
        choices=[("system", "Automático"), ("light", "Claro"), ("dark", "Escuro")],
    )
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        constraints = [models.UniqueConstraint(Lower("email"), name="unique_account_email_ci")]
