from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand


User = get_user_model()


DEMO_USERS = (
    {
        "username": "admin",
        "password": "admin123",
        "email": "admin@ldo2.local",
        "first_name": "System",
        "last_name": "Administrator",
        "role": "admin",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "a.kowalski",
        "password": "ldo2pass",
        "email": "a.kowalski@ldo2.local",
        "first_name": "Adam",
        "last_name": "Kowalski",
        "role": "engineer",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "username": "m.chen",
        "password": "ldo2pass",
        "email": "m.chen@ldo2.local",
        "first_name": "Ming",
        "last_name": "Chen",
        "role": "reviewer",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "username": "s.patel",
        "password": "ldo2pass",
        "email": "s.patel@ldo2.local",
        "first_name": "Sandeep",
        "last_name": "Patel",
        "role": "supervisor",
        "is_staff": False,
        "is_superuser": False,
    },
)


class Command(BaseCommand):
    help = "Create or update the demo users shown on the EDMS login screen."

    def add_arguments(self, parser):
        parser.add_argument(
            "--preserve-passwords",
            action="store_true",
            help="Keep existing passwords for users that already exist.",
        )

    def handle(self, *args, **options):
        preserve_passwords = options["preserve_passwords"]

        created = 0
        updated = 0

        for config in DEMO_USERS:
            group, _ = Group.objects.get_or_create(name=config["role"])

            user, was_created = User.objects.get_or_create(
                username=config["username"],
                defaults={
                    "email": config["email"],
                    "first_name": config["first_name"],
                    "last_name": config["last_name"],
                    "is_staff": config["is_staff"],
                    "is_superuser": config["is_superuser"],
                    "is_active": True,
                },
            )

            user.email = config["email"]
            user.first_name = config["first_name"]
            user.last_name = config["last_name"]
            user.is_staff = config["is_staff"]
            user.is_superuser = config["is_superuser"]
            user.is_active = True

            if was_created or not preserve_passwords:
                user.set_password(config["password"])

            user.save()
            user.groups.set([group])

            if was_created:
                created += 1
                action = "created"
            else:
                updated += 1
                action = "updated"

            self.stdout.write(
                self.style.SUCCESS(
                    f"{action}: {config['username']} ({config['role']})"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo users ready. Created {created}, updated {updated}."
            )
        )
