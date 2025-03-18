# Fireshare Development Scripts

This directory contains utility scripts for development and debugging purposes.

## Scripts

### `check_db.py`
Directly connects to the SQLite database to inspect tables and relationships.
Useful for diagnosing data integrity issues.

```bash
# Run from project root
python dev_scripts/check_db.py
```

### `check_games.py`
Makes HTTP requests to the running API to check game and video relationships.
Useful for verifying API responses against database state.

```bash
# Run from project root (with server running)
python dev_scripts/check_games.py
```

### `create_db.py`
Creates the initial database structure with an admin user.
Useful for setting up a fresh development environment.

```bash
# Run from project root
python dev_scripts/create_db.py
```

## Usage

These scripts are for development purposes only and should not be used in production.
They're particularly helpful for debugging issues with database relationships and
API responses during development of the game-based organization system.