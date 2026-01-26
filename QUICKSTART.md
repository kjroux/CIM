# Quick Start Guide

## Get the App Running

### Step 1: Generate Icons

Open `generate-icons.html` in your web browser:

```bash
open ~/Projects/cim-training-app/generate-icons.html
```

Click the download buttons to save the PNG icons, then move them to the icons folder.

### Step 2: Start Local Server

In Terminal, navigate to the project and start a web server:

```bash
cd ~/Projects/cim-training-app

# Option 1: Python (usually pre-installed on Mac)
python3 -m http.server 8000

# Option 2: Node.js (if you have it installed)
npx http-server -p 8000
```

### Step 3: Open the App

Open your browser to: **http://localhost:8000**

### Step 4: Install as PWA (Optional)

On your iPhone/iPad:
1. Open Safari and go to http://YOUR_COMPUTER_IP:8000
2. Tap the Share button (square with arrow)
3. Tap "Add to Home Screen"
4. Name it "CIM Training" and tap "Add"
5. The app is now on your home screen!

## First Time Setup

1. **Set Your Start Date**: Go to Settings → Enter your program start date (must be a Monday) → Save
2. **Navigate**: Use the bottom navigation to switch between Today, Week, and Settings views
3. **Log Workouts**:
   - For lifts: Enter weight and reps for each set
   - For runs: Enter distance, duration, and average HR
   - Tap "Complete Workout" when done

## Daily Usage

1. Open the app (works offline!)
2. Check today's workout in the Today view
3. Log your workout details as you go
4. Check off morning/evening routines
5. Add notes about how you felt
6. Mark complete when done

## Week View

- Swipe between weeks
- See weekly progress
- Tap any day to jump to it
- View mileage targets vs actual

## Data Notes

- All data is stored locally in your browser
- Works completely offline
- Data is private (never sent to any server)
- Backup your data by not clearing browser cache/data
- Each device/browser has its own separate storage

## Need Help?

See the full [README.md](README.md) for more details.

## Program Overview

- **Phase 1** (4 weeks): Strength + Walk/Run
- **Phase 2** (4 weeks): Transition to Running
- **Phase 3** (13 weeks): Base Building
- **Goal**: Ready for marathon training block starting July 2026

Happy training! 🏃‍♂️
