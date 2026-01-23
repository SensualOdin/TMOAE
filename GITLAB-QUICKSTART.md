# GitLab Quick Start - SharePoint Auto-Sync

Since you're using **GitLab**, here are the key differences and your specific setup instructions.

---

## Your GitLab Setup

**Repository**: https://gitlab.com/George.Gewinner/ae-inventory
**GitLab Pages**: https://george.gewinner.gitlab.io/ae-inventory/
**Branch**: `master`

You also have a GitHub mirror at: https://github.com/SensualOdin/TMOAE

---

## 🎯 Recommended Approach for GitLab

### Option 1: Power Automate → GitLab API (Recommended)

**Setup Steps**:

1. **Create GitLab Personal Access Token**
   - Go to GitLab.com → Profile → Preferences → Access Tokens
   - Name: "Power Automate SharePoint Sync"
   - Scopes: ✅ `api`, ✅ `write_repository`, ✅ `read_repository`
   - Click "Create personal access token"
   - **Copy the token** (starts with `glpat-`)

2. **Build Power Automate Flow**
   - Follow the detailed guide: `.gitlab-automation-setup.md`
   - Key differences from GitHub:
     - Use `PRIVATE-TOKEN` header (not `Authorization`)
     - API Base: `https://gitlab.com/api/v4`
     - Project path: `George.Gewinner%2Fae-inventory` (URL encoded)

3. **HTTP Action Example**:
```json
Method: PUT
URI: https://gitlab.com/api/v4/projects/George.Gewinner%2Fae-inventory/repository/files/[FILENAME]

Headers:
  PRIVATE-TOKEN: glpat-your-token-here
  Content-Type: application/json

Body:
{
  "branch": "master",
  "content": "@{base64(body('Get_file_content'))}",
  "commit_message": "Auto-update from SharePoint",
  "encoding": "base64"
}
```

---

### Option 2: Python Script → GitLab (Alternative)

The Python script (`sync-sharepoint-github.py`) now supports GitLab!

**Setup**:

1. Install dependencies:
```bash
pip install office365-rest-python-client requests GitPython python-dotenv
```

2. Configure for GitLab:
```bash
# Copy example file
copy .env.example .env

# Edit .env file with your credentials
notepad .env
```

3. In `.env`, add:
```
SHAREPOINT_USER=your.email@tmobile.com
SHAREPOINT_PASS=your_password
GITLAB_TOKEN=glpat-your-token-here
```

4. In `sync-sharepoint-github.py`, set:
```python
USE_GIT_COMMANDS = True  # Uses git push (easier)
USE_GITLAB = True  # Set to True for GitLab
```

5. Test:
```bash
python sync-sharepoint-github.py
```

---

## Key GitLab API Differences

### Headers
- **GitHub**: `Authorization: token ghp_xxx`
- **GitLab**: `PRIVATE-TOKEN: glpat-xxx`

### API Endpoints
- **GitHub**: `https://api.github.com/repos/{owner}/{repo}/contents/{file}`
- **GitLab**: `https://gitlab.com/api/v4/projects/{project}/repository/files/{file}`

### Project Identifier
You can use either:
- **Path**: `George.Gewinner/ae-inventory` (must be URL encoded: `George.Gewinner%2Fae-inventory`)
- **ID**: Numeric project ID (find in Settings → General)

### File Paths
Must be URL encoded:
- `Mobility Hardware Report 01.16.2026.xlsx`
- Becomes: `Mobility%20Hardware%20Report%2001.16.2026.xlsx`

---

## GitLab Pages Auto-Deploy

Your GitLab repository should auto-deploy to GitLab Pages when you push.

**Check deployment**:
1. Go to your project on GitLab
2. CI/CD → Pipelines
3. Should see green checkmark for recent commits

**If not deploying**, check `.gitlab-ci.yml`:

```yaml
pages:
  stage: deploy
  script:
    - mkdir -p public
    - cp -r *.html *.css *.js *.xlsx public/
  artifacts:
    paths:
      - public
  only:
    - master
```

---

## Testing Your Setup

### Test Power Automate Flow:
1. Modify an Excel file in SharePoint
2. Wait 1-2 minutes
3. Check Power Automate run history
4. Verify commit appears in GitLab
5. Check GitLab Pages updated

### Test Python Script:
```bash
# Test run
python sync-sharepoint-github.py

# Check git status
git status

# Verify push worked
git log --oneline -1
```

---

## Dual Setup: GitLab + GitHub

Since you have both remotes configured, you can push to both:

**In Python script**, the git commands will push to both:
```python
origin = repo.remote('origin')  # GitHub
origin.push()

gitlab = repo.remote('gitlab')  # GitLab
gitlab.push()
```

**Or in Power Automate**, create two HTTP actions:
1. One for GitLab API
2. One for GitHub API

---

## URL Encoding Helper

For Power Automate, you'll need to URL encode filenames:

| Character | Encoded |
|-----------|---------|
| Space ` ` | `%20` |
| `/` | `%2F` |
| `.` | `.` (no encoding) |

**Examples**:
- `Mobility Hardware Report 01.16.2026.xlsx`
  → `Mobility%20Hardware%20Report%2001.16.2026.xlsx`

- `T-Mobile Formatted Inventory Report 1.20.26.xlsx`
  → `T-Mobile%20Formatted%20Inventory%20Report%201.20.26.xlsx`

---

## Quick Reference

**Your GitLab Info**:
```
Repository: https://gitlab.com/George.Gewinner/ae-inventory
Project Path: George.Gewinner/ae-inventory
URL Encoded: George.Gewinner%2Fae-inventory
Branch: master
Pages URL: https://george.gewinner.gitlab.io/ae-inventory/
```

**Token Format**:
```
GitLab: glpat-xxxxxxxxxxxxxxxxxxxx
GitHub: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**API Endpoints**:
```
GitLab API: https://gitlab.com/api/v4
GitHub API: https://api.github.com
```

---

## Next Steps

1. ✅ Read the detailed setup guide: `.gitlab-automation-setup.md`
2. ✅ Create your GitLab Personal Access Token
3. ✅ Choose your method (Power Automate or Python)
4. ✅ Test with one file first
5. ✅ Monitor for the first week

---

## Files to Review

- **`.gitlab-automation-setup.md`** - Detailed Power Automate setup for GitLab
- **`sync-sharepoint-github.py`** - Python script (works with GitLab)
- **`.env.example`** - Environment variables template
- **`QUICK-START.md`** - General overview of all methods

---

**Ready to start?** Choose Power Automate for simplicity, or Python script for more control!
