#!/bin/bash

if [ -e db.sqlite3 ]; then
    rm db.sqlite3
fi

python manage.py syncdb --noinput

# Create 'admin' user with password 'admin'.  Redirect stderr/stdout
# to /dev/null, to hide potentially confusing messages from user.
echo "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@example.com', 'admin')" | python manage.py shell > /dev/null 2>&1
