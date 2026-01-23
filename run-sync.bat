@echo off
REM SharePoint to GitHub Auto-Sync Script
REM Run this batch file manually or schedule with Windows Task Scheduler

cd /d "c:\Users\GGewinn\OneDrive - T-Mobile USA\Desktop\GitHub\AE Inventory"

echo ========================================
echo SharePoint to GitHub Sync Starting...
echo ========================================
echo.

REM Activate virtual environment if you're using one
REM call venv\Scripts\activate

REM Run the Python sync script
python sync-sharepoint-github.py

REM Check exit code
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Sync completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Sync failed! Check the output above.
    echo ========================================
)

REM Pause so you can see the output (remove for scheduled tasks)
pause
