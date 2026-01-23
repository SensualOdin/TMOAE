# Quick Start Guide - SharePoint Auto-Sync

Choose one of these three methods to auto-sync your SharePoint Excel files to GitHub:

---

## ✅ Method 1: Power Automate (Recommended)

**Best for**: Office 365 users with Power Automate access

**Setup Time**: 15-30 minutes

**Steps**:
1. Follow the detailed guide in `.github-automation-setup.md`
2. Create GitHub Personal Access Token
3. Build Power Automate Flow with these triggers:
   - SharePoint: When file is modified
   - HTTP: Push to GitHub API
4. Test with one file first

**Pros**:
- No coding required
- Cloud-based (runs automatically)
- Visual workflow builder
- Built-in error handling

**Cons**:
- Requires Power Automate license
- HTTP connector may need Premium

**Status**: Ready to implement (see `.github-automation-setup.md`)

---

## ✅ Method 2: Python Script with Task Scheduler

**Best for**: Users comfortable with Python and command line

**Setup Time**: 30-45 minutes

**Steps**:

### 1. Install Python Dependencies
```bash
pip install office365-rest-python-client requests GitPython python-dotenv
```

### 2. Configure Credentials
```bash
# Copy the example file
copy .env.example .env

# Edit .env with your credentials
notepad .env
```

### 3. Test the Script
```bash
python sync-sharepoint-github.py
```

### 4. Schedule with Windows Task Scheduler
1. Open **Task Scheduler** (search in Start menu)
2. Click **Create Basic Task**
3. Name: "SharePoint to GitHub Sync"
4. Trigger: **Daily** or **Hourly** (your choice)
5. Action: **Start a program**
6. Program: `c:\Users\GGewinn\OneDrive - T-Mobile USA\Desktop\GitHub\AE Inventory\run-sync.bat`
7. Finish and test

**Pros**:
- Full control over sync logic
- No licensing costs
- Can customize easily
- Works offline (when on network)

**Cons**:
- Requires Python setup
- Must run on a computer
- Manual scheduling

**Status**: Script ready (`sync-sharepoint-github.py`)

---

## ✅ Method 3: Manual Sync (Fallback)

**Best for**: Quick testing or backup method

**Setup Time**: 5 minutes

**Steps**:
1. Download files from SharePoint manually
2. Copy to repository folder
3. Run:
```bash
git add "Mobility Hardware Report 01.16.2026.xlsx" "T-Mobile Formatted Inventory Report 1.20.26.xlsx"
git commit -m "Update inventory files from SharePoint"
git push origin master
git push gitlab master
```

**Pros**:
- Simple, no setup
- Full control
- No credentials needed

**Cons**:
- Manual process
- Time-consuming
- Easy to forget

---

## 📋 Comparison Table

| Feature | Power Automate | Python Script | Manual |
|---------|---------------|---------------|---------|
| Setup Difficulty | Medium | Medium-Hard | Easy |
| Automation | Full | Full | None |
| Cost | License | Free | Free |
| Reliability | High | High | Medium |
| Customization | Limited | Full | Full |
| Maintenance | Low | Medium | None |

---

## 🚀 Recommended Approach

**For your use case**, I recommend:

1. **Start with Power Automate** (Method 1)
   - Since you have access to it
   - Set it up following the detailed guide
   - Test with one file first

2. **Keep Python script as backup** (Method 2)
   - In case Power Automate has issues
   - Can run manually when needed
   - Good for testing locally

3. **Document the manual process** (Method 3)
   - As a last resort fallback
   - For emergency updates

---

## 📞 Next Steps

1. **Read** the detailed setup guide: `.github-automation-setup.md`
2. **Choose** your preferred method above
3. **Test** with one Excel file first
4. **Monitor** for the first week to ensure reliability
5. **Document** your process for team members

---

## ⚠️ Important Notes

- **Never commit** your `.env` file or GitHub tokens to the repository
- **Test thoroughly** before relying on automation
- **Monitor** the first few runs to catch any issues
- **Have a backup plan** (manual sync) ready
- **Update file paths** in the scripts to match your SharePoint structure

---

## 🔧 Troubleshooting

### Power Automate Issues
- Check run history in Power Automate portal
- Verify SharePoint permissions
- Confirm GitHub token is valid

### Python Script Issues
- Check `.env` file has correct credentials
- Verify SharePoint paths are correct
- Test SharePoint connectivity first

### General Issues
- Confirm files are actually being modified in SharePoint
- Check GitHub repository permissions
- Verify GitLab mirror is configured

---

## 📚 Files in This Repository

- `.github-automation-setup.md` - Detailed Power Automate setup guide
- `sync-sharepoint-github.py` - Python automation script
- `.env.example` - Example environment variables file
- `run-sync.bat` - Windows batch file to run the sync
- `QUICK-START.md` - This file

---

**Questions?** Check the detailed setup guide or test each method to see which works best for your environment.
