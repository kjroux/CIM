# CIM Marathon Training App

A Progressive Web App (PWA) for tracking your 5-month marathon training program leading up to the California International Marathon in December 2026.

## Features

- **Today View**: Log daily workouts with detailed exercise tracking
- **Week View**: See your weekly progress and mileage targets
- **Settings**: Configure start date and manage data
- **Offline Support**: Works completely offline using localStorage and service worker
- **Mobile-First Design**: Optimized for iPhone and mobile devices

## Program Structure

### Phase 1: Strength + Walk/Run (Feb 2-Mar 1, 4 weeks)
- 3x/week lifting with glute emphasis
- Walk/run progression on treadmill
- Building tissue adaptation

### Phase 2: Transition to Running (Mar 2-29, 4 weeks)
- 2x/week lifting
- Continuous running begins
- Building to 17 miles/week

### Phase 3: Base Building (Mar 30-Jun 28, 13 weeks)
- 2x/week maintenance lifting
- Progressive mileage building to 32 mpw
- Weekly strides
- 16-mile long run

## Installation

### Local Development

1. Navigate to the project directory:
   ```bash
   cd ~/Projects/cim-training-app
   ```

2. Serve the app using a local web server. You can use Python's built-in server:
   ```bash
   # Python 3
   python3 -m http.server 8000
   ```
   Or Node.js:
   ```bash
   npx http-server -p 8000
   ```

3. Open your browser to `http://localhost:8000`

### Install as PWA

1. Open the app in your mobile browser (Safari on iOS, Chrome on Android)
2. On iOS: Tap the Share button, then "Add to Home Screen"
3. On Android: Tap the menu, then "Add to Home Screen" or "Install App"
4. The app will now work offline!

## Icon Setup

The app currently includes SVG placeholder icons. For proper PWA icons, you need PNG files:

### Option 1: Convert SVG to PNG

Use an online converter or ImageMagick:
```bash
# If you have ImageMagick installed
convert -background none icons/icon-192.svg icons/icon-192.png
convert -background none icons/icon-512.svg icons/icon-512.png
```

### Option 2: Create Custom Icons

Create 192x192 and 512x512 PNG icons with your preferred design tool and save them as:
- `icons/icon-192.png`
- `icons/icon-512.png`

## Usage

### Logging Workouts

**Lifting Days:**
1. Navigate to Today view
2. Enter weight and reps for each set
3. Data saves automatically on input
4. Tap "Complete Workout" when done

**Running Days:**
1. Navigate to Today view
2. Enter distance, duration, and average heart rate
3. For stride days, check the strides checkbox and enter count
4. Tap "Complete Workout" when done

**Daily Routines:**
- Check off morning and evening routines as completed
- These help track mobility and recovery work

### Week View

- See all 7 days of the current week
- View completion status (✓ done, ✗ skipped, ○ upcoming)
- See weekly mileage progress vs target
- Tap any day to navigate to that day's workout

### Settings

- **Start Date**: Change the program start date (must be a Monday)
- **Reset Data**: Clear all logged workouts and start fresh

## Data Storage

All data is stored locally in your browser's localStorage. This means:
- ✅ Works completely offline
- ✅ Fast and responsive
- ✅ Private (data never leaves your device)
- ⚠️ Data is tied to this browser on this device
- ⚠️ Clearing browser data will delete your logs

## Tech Stack

- Vanilla JavaScript (no frameworks)
- HTML5 + CSS3
- Progressive Web App (PWA) with Service Worker
- localStorage for data persistence
- Mobile-first responsive design

## File Structure

```
cim-training-app/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline support
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── app.js              # Main application logic
│   ├── data.js             # Program data and workout details
│   └── storage.js          # localStorage helpers
├── icons/
│   ├── icon-192.svg        # SVG icon (192x192)
│   ├── icon-512.svg        # SVG icon (512x512)
│   ├── icon-192.png        # PNG icon (to be created)
│   └── icon-512.png        # PNG icon (to be created)
└── README.md               # This file
```

## Browser Compatibility

- iOS Safari 11.3+
- Chrome/Edge 67+
- Firefox 63+

## Troubleshooting

**App won't install as PWA:**
- Make sure you're using HTTPS or localhost
- Check that icon PNG files exist
- Try clearing browser cache and reloading

**Data disappeared:**
- Check if browser data/cache was cleared
- Each browser/device has separate storage
- Consider exporting data periodically (feature coming in V2)

**Service worker not updating:**
- Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
- Clear service worker from browser dev tools
- The cache version will auto-update when service-worker.js changes

## Future Enhancements (V2)

- Progress charts and visualization
- Data export/backup functionality
- Exercise library with descriptions
- Drag-and-drop workout rescheduling
- Notifications for scheduled workouts
- Extended daily routine tracking

## License

Personal use project

## Credits

Training program designed for CIM 2025 Marathon preparation
App built with Claude Code
