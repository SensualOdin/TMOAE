"""
SharePoint to GitHub Sync Script
Alternative to Power Automate if HTTP Premium connector is unavailable

This script:
1. Downloads Excel files from SharePoint
2. Checks if they've been modified
3. Commits and pushes to GitHub/GitLab

Requirements:
- pip install office365-rest-python-client requests GitPython

Setup:
1. Create a .env file with your credentials
2. Run this script on a schedule (Windows Task Scheduler or cron)
"""

import os
import base64
import requests
from datetime import datetime
from office365.runtime.auth.user_credential import UserCredential
from office365.sharepoint.client_context import ClientContext
from office365.sharepoint.files.file import File
import git
from pathlib import Path

# ==========================================
# Configuration
# ==========================================

SHAREPOINT_SITE_URL = "https://yourcompany.sharepoint.com/sites/YourSite"
SHAREPOINT_USERNAME = os.getenv("SHAREPOINT_USER", "your.email@company.com")
SHAREPOINT_PASSWORD = os.getenv("SHAREPOINT_PASS", "your_password")

# SharePoint file paths (relative to site)
SHAREPOINT_FILES = {
    "prosys": "/Shared Documents/Inventory Reports/Mobility Hardware Report 01.16.2026.xlsx",
    "connection": "/Shared Documents/Inventory Reports/T-Mobile Formatted Inventory Report 1.20.26.xlsx"
}

# Local repository path
REPO_PATH = r"c:\Users\GGewinn\OneDrive - T-Mobile USA\Desktop\GitHub\AE Inventory"

# Local file names (where to save in repo)
LOCAL_FILES = {
    "prosys": "Mobility Hardware Report 01.16.2026.xlsx",
    "connection": "T-Mobile Formatted Inventory Report 1.20.26.xlsx"
}

# Git settings - supports both GitHub and GitLab
USE_GIT_COMMANDS = True  # Set to False to use API instead
USE_GITLAB = True  # Set to True for GitLab, False for GitHub

# GitHub settings (if using GitHub API)
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "ghp_your_token_here")
GITHUB_REPO = "SensualOdin/TMOAE"
GITHUB_BRANCH = "master"

# GitLab settings (if using GitLab API)
GITLAB_TOKEN = os.getenv("GITLAB_TOKEN", "glpat_your_token_here")
GITLAB_PROJECT = "George.Gewinner/ae-inventory"  # Or use project ID number
GITLAB_BRANCH = "master"

# ==========================================
# SharePoint Functions
# ==========================================

def connect_to_sharepoint():
    """Authenticate to SharePoint"""
    try:
        credentials = UserCredential(SHAREPOINT_USERNAME, SHAREPOINT_PASSWORD)
        ctx = ClientContext(SHAREPOINT_SITE_URL).with_credentials(credentials)
        return ctx
    except Exception as e:
        print(f"❌ Failed to connect to SharePoint: {e}")
        return None

def download_file_from_sharepoint(ctx, server_relative_url, local_path):
    """Download a file from SharePoint"""
    try:
        response = File.open_binary(ctx, server_relative_url)

        with open(local_path, 'wb') as local_file:
            local_file.write(response.content)

        print(f"✅ Downloaded: {os.path.basename(local_path)}")
        return True
    except Exception as e:
        print(f"❌ Failed to download {server_relative_url}: {e}")
        return False

def get_file_modified_date(ctx, server_relative_url):
    """Get the last modified date of a SharePoint file"""
    try:
        file = ctx.web.get_file_by_server_relative_url(server_relative_url)
        ctx.load(file)
        ctx.execute_query()
        return file.time_last_modified
    except Exception as e:
        print(f"❌ Failed to get modified date: {e}")
        return None

# ==========================================
# Git Functions
# ==========================================

def commit_and_push_changes(file_names, commit_message=None):
    """Commit and push changes to GitHub and GitLab"""
    try:
        repo = git.Repo(REPO_PATH)

        # Check if there are changes
        if not repo.is_dirty(untracked_files=True):
            print("ℹ️  No changes to commit")
            return True

        # Add specific files
        for file_name in file_names:
            repo.index.add([file_name])

        # Create commit message
        if not commit_message:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            commit_message = f"Auto-update inventory files from SharePoint - {timestamp}\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

        # Commit
        repo.index.commit(commit_message)
        print(f"✅ Committed changes: {commit_message.split(chr(10))[0]}")

        # Push to GitHub (origin)
        origin = repo.remote('origin')
        origin.push()
        print("✅ Pushed to GitHub (origin)")

        # Push to GitLab if configured
        try:
            gitlab = repo.remote('gitlab')
            gitlab.push()
            print("✅ Pushed to GitLab")
        except Exception as e:
            print(f"ℹ️  GitLab remote not configured or push failed: {e}")

        return True

    except Exception as e:
        print(f"❌ Git operation failed: {e}")
        return False

# ==========================================
# GitHub API Functions
# ==========================================

def push_to_github_api(file_path, github_path, commit_message):
    """Push file directly to GitHub using API"""
    try:
        # Read file content
        with open(file_path, 'rb') as f:
            content = base64.b64encode(f.read()).decode('utf-8')

        # GitHub API endpoint
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{github_path}"

        # Get current file SHA (needed for updates)
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }

        response = requests.get(url, headers=headers)
        sha = response.json().get('sha') if response.status_code == 200 else None

        # Prepare request body
        data = {
            "message": commit_message,
            "content": content,
            "branch": GITHUB_BRANCH
        }

        if sha:
            data["sha"] = sha

        # Push to GitHub
        response = requests.put(url, json=data, headers=headers)

        if response.status_code in [200, 201]:
            print(f"✅ Pushed {github_path} to GitHub via API")
            return True
        else:
            print(f"❌ GitHub API error: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ Failed to push via GitHub API: {e}")
        return False

# ==========================================
# GitLab API Functions
# ==========================================

def push_to_gitlab_api(file_path, gitlab_path, commit_message):
    """Push file directly to GitLab using API"""
    try:
        # Read file content
        with open(file_path, 'rb') as f:
            content = base64.b64encode(f.read()).decode('utf-8')

        # URL encode the file path
        import urllib.parse
        encoded_path = urllib.parse.quote(gitlab_path, safe='')

        # URL encode the project path
        encoded_project = urllib.parse.quote(GITLAB_PROJECT, safe='')

        # GitLab API endpoint
        url = f"https://gitlab.com/api/v4/projects/{encoded_project}/repository/files/{encoded_path}"

        headers = {
            "PRIVATE-TOKEN": GITLAB_TOKEN,
            "Content-Type": "application/json"
        }

        # Check if file exists
        params = {"ref": GITLAB_BRANCH}
        response = requests.get(url, headers=headers, params=params)
        file_exists = response.status_code == 200

        # Prepare request body
        data = {
            "branch": GITLAB_BRANCH,
            "content": content,
            "commit_message": commit_message,
            "encoding": "base64"
        }

        # Use PUT for update, POST for create
        if file_exists:
            response = requests.put(url, json=data, headers=headers)
        else:
            response = requests.post(url, json=data, headers=headers)

        if response.status_code in [200, 201]:
            print(f"✅ Pushed {gitlab_path} to GitLab via API")
            return True
        else:
            print(f"❌ GitLab API error: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ Failed to push via GitLab API: {e}")
        return False

# ==========================================
# Main Sync Logic
# ==========================================

def check_for_updates():
    """Check SharePoint for file updates and sync to GitHub"""
    print("\n" + "="*60)
    print(f"🔄 SharePoint to GitHub Sync - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60 + "\n")

    # Connect to SharePoint
    ctx = connect_to_sharepoint()
    if not ctx:
        return False

    # Track downloaded files
    downloaded_files = []

    # Check and download each file
    for key, sharepoint_path in SHAREPOINT_FILES.items():
        print(f"\nChecking {key.upper()} file...")

        local_file = os.path.join(REPO_PATH, LOCAL_FILES[key])

        # Download file
        if download_file_from_sharepoint(ctx, sharepoint_path, local_file):
            downloaded_files.append(LOCAL_FILES[key])

    # If files were downloaded, commit and push
    if downloaded_files:
        print(f"\n📝 Committing {len(downloaded_files)} file(s) to Git...")
        commit_message = f"Auto-update from SharePoint: {', '.join(downloaded_files)}\n\nUpdated on {datetime.now().strftime('%Y-%m-%d at %H:%M:%S')}\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

        # Choose push method
        if USE_GIT_COMMANDS:
            # Use git commands (recommended)
            if commit_and_push_changes(downloaded_files, commit_message):
                print(f"\n✨ Successfully synced {len(downloaded_files)} file(s)!")
                return True
            else:
                print("\n⚠️  Files downloaded but git push failed")
                return False
        else:
            # Use API (alternative)
            success = True
            for file_name in downloaded_files:
                file_path = os.path.join(REPO_PATH, file_name)

                if USE_GITLAB:
                    if not push_to_gitlab_api(file_path, file_name, commit_message):
                        success = False
                else:
                    if not push_to_github_api(file_path, file_name, commit_message):
                        success = False

            if success:
                print(f"\n✨ Successfully synced {len(downloaded_files)} file(s) via API!")
                return True
            else:
                print("\n⚠️  Some files failed to push via API")
                return False
    else:
        print("\nℹ️  No files were updated")
        return True

# ==========================================
# Entry Point
# ==========================================

if __name__ == "__main__":
    try:
        success = check_for_updates()

        if success:
            print("\n✅ Sync completed successfully!")
            exit(0)
        else:
            print("\n❌ Sync completed with errors")
            exit(1)

    except KeyboardInterrupt:
        print("\n\n⚠️  Sync interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        exit(1)
