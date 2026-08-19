#!/bin/bash
# clean-history.sh
# Cleanup script to remove backend/.env from repository history using git-filter-repo (recommended)
# Usage: run this on a machine with push access to the remote repo.
# WARNING: This script force-pushes rewritten history. Ensure you have backups and coordinate with collaborators.

set -euo pipefail

REPO_SSH="git@github.com:gufronkhaironi34-collab/aplikasi-database-guru-sd.git"
TMPDIR="repo-clean-$(date +%s)"

echo "=== Git history cleanup script ==="

echo "Step 0: Verify prerequisites"
if ! command -v git >/dev/null 2>&1; then
  echo "git not found in PATH. Install git and retry." >&2
  exit 1
fi

if command -v git-filter-repo >/dev/null 2>&1; then
  FILTER_TOOL="git-filter-repo"
elif command -v bfg >/dev/null 2>&1 || command -v java >/dev/null 2>&1; then
  FILTER_TOOL="bfg"
else
  echo "Neither git-filter-repo nor BFG found. Install git-filter-repo (recommended) or BFG and try again." >&2
  echo "git-filter-repo: https://github.com/newren/git-filter-repo"
  echo "BFG: https://rtyley.github.io/bfg-repo-cleaner/" 
  exit 1
fi

# Create a mirror clone backup
echo "Creating mirror clone backup..."
git clone --mirror "$REPO_SSH" "${TMPDIR}.git"
if [ ! -d "${TMPDIR}.git" ]; then
  echo "Mirror clone failed" >&2
  exit 1
fi

tar -czf "${TMPDIR}.backup.tar.gz" "${TMPDIR}.git"
echo "Backup saved to ${TMPDIR}.backup.tar.gz"

cd "${TMPDIR}.git"

if [ "$FILTER_TOOL" = "git-filter-repo" ]; then
  echo "Using git-filter-repo to remove backend/.env from history..."
  # git-filter-repo must be run in a bare clone
  git filter-repo --path backend/.env --invert-paths
  echo "git-filter-repo finished"
else
  echo "Using BFG to remove backend/.env from history..."
  # If using BFG, BFG expects a bare mirror; call bfg --delete-files
  # Ensure 'bfg' is on PATH or use 'java -jar bfg.jar'
  if command -v bfg >/dev/null 2>&1; then
    bfg --delete-files backend/.env
  else
    echo "BFG not found on PATH. Please run: java -jar bfg.jar --delete-files backend/.env" >&2
    exit 1
  fi
  echo "BFG finished - running git reflog expire & gc"
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
fi

# Final garbage collection & push
echo "Final reflog expire & GC"
git reflog expire --expire=now --all || true
git gc --prune=now --aggressive || true

read -p "READY to force-push rewritten history to origin (this is destructive). Type 'YES' to continue: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "Aborting. No push performed." 
  echo "You can inspect the cleaned repo at: $(pwd)"
  exit 0
fi

# Force push all refs and tags
echo "Force-pushing all branches and tags to origin..."
git push --force --all origin
git push --force --tags origin

echo "Done. The repository history has been rewritten and pushed to remote."

echo "IMPORTANT next steps:"
echo "1) Rotate all secrets that may have been exposed (DB_PASSWORD, JWT_SECRET, API keys...)."
echo "2) Coordinate with collaborators: they must re-clone the repository after this operation."
echo "3) Enable branch protection and secret scanning on GitHub."
