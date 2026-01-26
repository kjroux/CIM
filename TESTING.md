# Testing Checklist

Use this checklist to test the app after any changes.

## Setup Tests

- [ ] Icons generated (visit `generate-icons.html` and download both icons)
- [ ] Local server starts without errors
- [ ] App loads at http://localhost:8000
- [ ] No console errors in browser dev tools
- [ ] Service worker registers successfully

## Today View Tests

- [ ] Today's date displays correctly
- [ ] Phase and week number are correct
- [ ] Correct workout displays for today
- [ ] Can navigate to previous day
- [ ] Can navigate to next day
- [ ] Date updates when navigating

### Lift Day Tests
- [ ] All exercises display
- [ ] Can enter weight for each set
- [ ] Can enter reps for each set
- [ ] Data persists on page refresh
- [ ] "Complete Workout" marks workout as done
- [ ] Completed state persists

### Run Day Tests
- [ ] Can enter distance
- [ ] Can enter duration
- [ ] Can enter average HR
- [ ] Target mileage displays (Phase 2-3)
- [ ] Strides checkbox shows on stride days (Phase 3)
- [ ] Can enter stride count
- [ ] Data persists on page refresh

### Daily Routines
- [ ] Can check morning routine
- [ ] Can check evening routine
- [ ] Routine state persists

### Actions
- [ ] "Complete Workout" button works
- [ ] "Skip Workout" button works
- [ ] Can mark as incomplete after completing
- [ ] Can unskip after skipping
- [ ] Notes save correctly

## Week View Tests

- [ ] Week displays correctly
- [ ] All 7 days show
- [ ] Can navigate to previous week
- [ ] Can navigate to next week
- [ ] Workout types display (lift/run/rest)
- [ ] Status icons show correctly:
  - [ ] ✓ for completed
  - [ ] ✗ for skipped
  - [ ] ○ for upcoming
- [ ] Can tap day to navigate to it
- [ ] Weekly summary shows:
  - [ ] Actual vs target mileage (Phase 2-3)
  - [ ] Workouts completed count
- [ ] Deload weeks marked (weeks 12, 16, 20)

## Settings View Tests

- [ ] Current start date displays
- [ ] Can change start date
- [ ] Start date saves correctly
- [ ] Program updates with new start date
- [ ] "Reset All Data" shows confirmation
- [ ] Reset actually clears all data
- [ ] App version displays

## Navigation Tests

- [ ] Bottom nav is always visible
- [ ] Can switch between Today/Week/Settings
- [ ] Active tab is highlighted
- [ ] Navigation works on mobile

## Data Persistence Tests

- [ ] Logged workouts persist after closing browser
- [ ] Can log multiple days
- [ ] Week view reflects all logged data
- [ ] Notes persist
- [ ] Routines persist
- [ ] Settings persist

## Offline Tests

- [ ] App loads when offline (after first visit)
- [ ] Can log workouts while offline
- [ ] Data saves while offline
- [ ] Service worker caches all assets
- [ ] No network errors in console when offline

## Mobile/PWA Tests

- [ ] Responsive on iPhone screen size (375px width)
- [ ] Touch targets are large enough (44px minimum)
- [ ] Can scroll all views
- [ ] Can install as PWA
- [ ] PWA opens in standalone mode
- [ ] App icon displays on home screen
- [ ] Works offline after installation

## Date/Phase Calculation Tests

- [ ] Week 1 (Feb 3-9): Phase 1, Lift A on Monday
- [ ] Week 5 (Mar 3-9): Phase 2, Lift A on Monday
- [ ] Week 9 (Mar 31-Apr 6): Phase 3, Easy Run on Monday
- [ ] Week 12: Shows deload badge
- [ ] Week 21: Last week of program

## Program Specifics Tests

### Phase 1 Workouts
- [ ] Lift A shows correct exercises (Low-bar squat, bench, etc.)
- [ ] Lift B shows correct exercises (Deadlift, rows, etc.)
- [ ] Lift C shows correct exercises (Front squat, hip thrust, etc.)
- [ ] Walk/Run shows week-specific protocol

### Phase 2 Workouts
- [ ] Lift A has fewer exercises
- [ ] Lift B shows tempo front squat
- [ ] Easy runs show mileage targets
- [ ] Week 3-4 show optional strides

### Phase 3 Workouts
- [ ] Lift A maintenance volume
- [ ] Lift B maintenance volume
- [ ] Easy Run + Strides on Wednesday
- [ ] Week 13 shows time trial info
- [ ] Mileage targets for each day

## Edge Cases

- [ ] Before program start date
- [ ] After program end date (week 22+)
- [ ] Leap day handling (if applicable)
- [ ] Multiple years span
- [ ] No data logged yet
- [ ] Partial workout logged
- [ ] Empty notes field

## Browser Compatibility

Test in:
- [ ] Safari (iOS)
- [ ] Chrome (Desktop)
- [ ] Chrome (Android)
- [ ] Safari (macOS)
- [ ] Firefox (Desktop)

## Performance

- [ ] App loads in < 1 second
- [ ] Switching views is instant
- [ ] No lag when typing in inputs
- [ ] Scrolling is smooth
- [ ] No memory leaks during extended use

---

## Found a Bug?

Note the following when reporting:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)
5. Screenshots (if helpful)
