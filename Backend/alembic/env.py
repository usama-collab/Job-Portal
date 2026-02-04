import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Make sure Alembic can find your app
sys.path.append(os.path.join(os.path.dirname(__file__), '../'))

# Import your Base where all models inherit
from app.core.db import Base

# Import all models here so Alembic can detect them
from app.models.user import User
from app.models.job import Job
from app.models.application import Application
from app.models.saved_job import SavedJob
# Add more models here as needed

# Alembic config object
config = context.config

# Setup logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for 'autogenerate'
target_metadata = Base.metadata  # lowercase 'metadata' ⚠️

# ------------------ OFFLINE MIGRATIONS ------------------ #
def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

# ------------------ ONLINE MIGRATIONS ------------------ #
def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()

# ------------------ RUN ------------------ #
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
