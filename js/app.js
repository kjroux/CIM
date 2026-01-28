// CIM Training App - Main Application Logic

const App = {
  currentView: 'today',
  currentDate: null,
  currentWeek: 1,
  exerciseDetail: null, // { exerciseId, exerciseName, exercise, tab: 'weight' }
  previousView: null, // For returning from exercise detail
  restTimer: { visible: false, startTime: null, interval: null }, // Phase 3: Rest timer

  init() {
    // Initialize storage
    Storage.initUserData();

    // Set current date
    this.currentDate = this.getTodayDateString();

    // Register service worker
    this.registerServiceWorker();

    // Setup event listeners
    this.setupEventListeners();

    // Render initial view
    this.renderView('today');
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => {
          console.log('[App] Service Worker registered');

          // Check for updates every 60 seconds
          setInterval(() => {
            reg.update();
          }, 60000);

          // Handle updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            console.log('[App] New service worker found, installing...');

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, prompt user to reload
                console.log('[App] New version available! Reloading in 2 seconds...');
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }
            });
          });
        })
        .catch(err => console.log('[App] Service Worker registration failed:', err));

      // Listen for controller change and reload page
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] Controller changed, reloading page');
        window.location.reload();
      });
    }
  },

  setupEventListeners() {
    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        this.renderView(view);
      });
    });
  },

  renderView(viewName) {
    this.currentView = viewName;

    // Clear rest timer if navigating away from today view
    if (viewName !== 'today') {
      this.stopRestTimer();
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Render appropriate view
    const contentArea = document.getElementById('main-content');
    switch(viewName) {
      case 'today':
        contentArea.innerHTML = this.renderTodayView();
        this.setupTodayViewListeners();
        break;
      case 'week':
        contentArea.innerHTML = this.renderWeekView();
        this.setupWeekViewListeners();
        break;
      case 'settings':
        contentArea.innerHTML = this.renderSettingsView();
        this.setupSettingsViewListeners();
        break;
      case 'exercise-detail':
        contentArea.innerHTML = this.renderExerciseDetailView();
        this.setupExerciseDetailListeners();
        break;
    }
  },

  // Date Utilities
  getTodayDateString() {
    const today = new Date();
    return this.formatDateString(today);
  },

  formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  parseDate(dateString) {
    return new Date(dateString + 'T00:00:00');
  },

  formatDisplayDate(dateString) {
    const date = this.parseDate(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  },

  addDays(dateString, days) {
    const date = this.parseDate(dateString);
    date.setDate(date.getDate() + days);
    return this.formatDateString(date);
  },

  getDaysBetween(date1String, date2String) {
    const date1 = this.parseDate(date1String);
    const date2 = this.parseDate(date2String);
    const diffTime = date2 - date1;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  },

  getWeekStart(dateString) {
    const date = this.parseDate(dateString);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    date.setDate(date.getDate() + diff);
    return this.formatDateString(date);
  },

  // Program Calculations
  getProgramInfo(dateString) {
    const startDate = Storage.getStartDate();
    const daysSinceStart = this.getDaysBetween(startDate, dateString);

    if (daysSinceStart < 0) {
      return { status: 'before', phase: null, week: null, dayOfWeek: null };
    }

    const programWeek = Math.floor(daysSinceStart / 7) + 1;
    const dayOfWeek = (daysSinceStart % 7) + 1;

    // Calculate phase
    let phase = null;
    let weekInPhase = programWeek;

    if (programWeek <= 4) {
      phase = 1;
      weekInPhase = programWeek;
    } else if (programWeek <= 8) {
      phase = 2;
      weekInPhase = programWeek - 4;
    } else if (programWeek <= 21) {
      phase = 3;
      weekInPhase = programWeek - 8;
    } else {
      return { status: 'after', phase: null, week: null, dayOfWeek: null };
    }

    return {
      status: 'active',
      phase: phase,
      week: programWeek,
      weekInPhase: weekInPhase,
      dayOfWeek: dayOfWeek,
      isDeload: MILEAGE_TARGETS[programWeek]?.isDeload || false
    };
  },

  getScheduledWorkout(dateString) {
    const info = this.getProgramInfo(dateString);
    if (info.status !== 'active') return null;

    const phaseData = PROGRAM.phases.find(p => p.id === info.phase);
    if (!phaseData) return null;

    return phaseData.weekTemplate[info.dayOfWeek];
  },

  // TODAY VIEW
  renderTodayView() {
    const info = this.getProgramInfo(this.currentDate);
    const workout = this.getScheduledWorkout(this.currentDate);
    const log = Storage.getLog(this.currentDate);
    const routines = Storage.getDailyRoutines(this.currentDate) || { morning: false, evening: false };

    let headerClass = 'workout-rest';
    if (workout) {
      if (workout.type.includes('lift')) headerClass = 'workout-lift';
      else if (workout.type.includes('run')) headerClass = 'workout-run';
    }

    let deloadBadge = info.isDeload ? '<span class="deload-badge">Deload Week</span>' : '';

    // Handle before/after program status
    let phaseInfo = '';
    if (info.status === 'before') {
      const startDate = Storage.getStartDate();
      phaseInfo = `Program starts ${this.formatDisplayDate(startDate)}`;
    } else if (info.status === 'after') {
      phaseInfo = 'Program completed';
    } else {
      phaseInfo = `Phase ${info.phase} &bull; Week ${info.week} ${deloadBadge}`;
    }

    return `
      <div class="today-view">
        <div class="today-header ${headerClass}">
          <div class="date-nav">
            <button class="btn-icon" id="prev-day">&larr;</button>
            <h2>${this.formatDisplayDate(this.currentDate)}</h2>
            <button class="btn-icon" id="next-day">&rarr;</button>
          </div>
          <div class="phase-info">
            ${phaseInfo}
          </div>
        </div>

        <div class="workout-content">
          ${this.renderWorkoutContent(workout, info, log)}
        </div>

        <div class="daily-routines">
          <h3>Daily Routines</h3>
          <label class="routine-checkbox">
            <input type="checkbox" id="morning-routine" ${routines.morning ? 'checked' : ''}>
            <span>Morning Routine</span>
          </label>
          <label class="routine-checkbox">
            <input type="checkbox" id="evening-routine" ${routines.evening ? 'checked' : ''}>
            <span>Evening Routine</span>
          </label>
        </div>

        <div class="workout-notes">
          <label for="notes-input">Notes:</label>
          <textarea id="notes-input" rows="3" placeholder="Log notes about today's workout...">${log?.notes || ''}</textarea>
        </div>

        <div class="workout-actions">
          ${log?.completed ?
            '<button class="btn btn-secondary" id="btn-mark-incomplete">Mark Incomplete</button>' :
            '<button class="btn btn-primary" id="btn-complete">Complete Workout</button>'
          }
          ${!log?.skipped ?
            '<button class="btn btn-secondary" id="btn-skip">Skip Workout</button>' :
            '<button class="btn btn-secondary" id="btn-unskip">Unskip Workout</button>'
          }
        </div>
      </div>
    `;
  },

  renderWorkoutContent(workout, info, log) {
    if (!workout) {
      if (info.status === 'before') {
        const startDate = Storage.getStartDate();
        return `<div class="workout-empty">
          <p>Training program hasn't started yet.</p>
          <p>Program begins on <strong>${this.formatDisplayDate(startDate)}</strong></p>
          <p>Use the Settings tab to adjust your start date if needed.</p>
        </div>`;
      } else if (info.status === 'after') {
        return '<div class="workout-empty">Program has ended. Great work completing the base building phase!</div>';
      }
      return '<div class="workout-empty">No workout scheduled for this day</div>';
    }

    if (workout.type === 'rest') {
      return `
        <h2>${workout.name}</h2>
        <p class="workout-desc">Full rest day. Focus on evening routine and recovery.</p>
      `;
    }

    if (workout.type === 'optional') {
      return `
        <h2>${workout.name}</h2>
        <p class="workout-desc">Optional workout day - walk/run, zone 2 bike, or rest.</p>
        ${this.renderRunInputs(log)}
      `;
    }

    // Lifting workouts
    if (workout.type.includes('lift')) {
      return this.renderLiftWorkout(workout, info, log);
    }

    // Running workouts
    if (workout.type.includes('run') || workout.type === 'walk-run') {
      return this.renderRunWorkout(workout, info, log);
    }

    return '<div class="workout-empty">Workout details not available</div>';
  },

  renderLiftWorkout(workout, info, log) {
    const liftType = workout.type;
    const phaseKey = `phase${info.phase}`;
    const workoutDetails = WORKOUT_DETAILS[liftType]?.[phaseKey];

    if (!workoutDetails) {
      return `<h2>${workout.name}</h2><p>Workout details coming soon</p>`;
    }

    const exercises = workoutDetails.exercises.map(ex => {
      const exerciseLog = log?.exercises?.[ex.id] || {};
      const loggedSets = exerciseLog.sets || [];
      const loggedWeight = exerciseLog.weight || Storage.getExerciseWeight(ex.id) || '';
      const repsDisplay = typeof ex.reps === 'number' ? `${ex.reps} reps` : ex.reps;

      return `
        <div class="exercise-item" data-exercise-id="${ex.id}" data-exercise-name="${ex.name}">
          <div class="exercise-header clickable-exercise">
            <div class="exercise-header-content">
              <h4>${ex.name} →</h4>
              <span class="exercise-target">${ex.sets}x${repsDisplay}</span>
            </div>
          </div>
          ${ex.notes ? `<p class="exercise-notes">${ex.notes}</p>` : ''}
          <div class="exercise-sets">
            ${this.renderExerciseSets(ex, loggedSets, loggedWeight)}
          </div>
        </div>
      `;
    }).join('');

    return `
      <h2>${workoutDetails.name}</h2>
      <p class="workout-duration">${workoutDetails.duration}</p>
      <div class="exercises-list">
        ${exercises}
      </div>
    `;
  },

  renderExerciseSets(exercise, loggedSets, weight) {
    let sets = [];
    const isTimeBased = typeof exercise.reps === 'string' && (exercise.reps.includes('sec') || exercise.reps.includes('min'));
    const targetValue = isTimeBased ? parseInt(exercise.reps) : exercise.reps;

    // Render programmed sets
    const numSets = exercise.sets;
    for (let i = 0; i < numSets; i++) {
      const logged = loggedSets[i] || { reps: '', completed: false };
      const isCompleted = logged.completed || false;
      const actualValue = logged.reps || (isTimeBased ? logged.seconds : '') || '';

      // Display value: show actual if logged, otherwise show target
      const displayValue = actualValue || targetValue;
      const buttonClass = isCompleted ? 'set-button completed' : 'set-button';

      sets.push(`
        <button class="${buttonClass}"
                data-set="${i}"
                data-target="${targetValue}"
                data-actual="${actualValue}"
                data-completed="${isCompleted}"
                data-time-based="${isTimeBased}"
                data-is-extra="false">
          ${displayValue}${isTimeBased ? 's' : ''}
        </button>
      `);
    }

    // Render extra sets if they exist in logged data
    for (let i = numSets; i < loggedSets.length; i++) {
      const logged = loggedSets[i];
      const isCompleted = logged.completed || false;
      const actualValue = logged.reps || (isTimeBased ? logged.seconds : '') || '';

      const displayValue = actualValue || targetValue;
      const buttonClass = isCompleted ? 'set-button completed extra-set' : 'set-button extra-set';

      sets.push(`
        <button class="${buttonClass}"
                data-set="${i}"
                data-target="${targetValue}"
                data-actual="${actualValue}"
                data-completed="${isCompleted}"
                data-time-based="${isTimeBased}"
                data-is-extra="true">
          ${displayValue}${isTimeBased ? 's' : ''}
        </button>
      `);
    }

    // Add the + button for adding extra sets
    sets.push(`
      <button class="set-button add-set-button" data-target="${targetValue}" data-time-based="${isTimeBased}">
        +
      </button>
    `);

    return `<div class="set-buttons">${sets.join('')}</div>`;
  },

  renderRunWorkout(workout, info, log) {
    if (workout.type === 'walk-run') {
      const weekInPhase = info.weekInPhase;
      const runDetails = WORKOUT_DETAILS['walk-run'].phase1;
      const weekProtocol = runDetails.weeks[weekInPhase];

      return `
        <h2>${workout.name}</h2>
        <div class="run-protocol">
          <h3>Week ${weekInPhase} Protocol</h3>
          <p class="protocol-text">${weekProtocol.protocol}</p>
          <p class="protocol-detail">Total: ${weekProtocol.totalTime} min (${weekProtocol.runningTime} min running)</p>
        </div>
        <p class="workout-notes">${runDetails.notes}</p>
        ${this.renderRunInputs(log)}
      `;
    }

    const mileageTarget = MILEAGE_TARGETS[info.week];
    let targetMiles = 0;
    if (mileageTarget) {
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const date = this.parseDate(this.currentDate);
      const dayName = dayNames[date.getDay()];
      targetMiles = mileageTarget[dayName] || 0;
    }

    const hasStrides = workout.type === 'easy-run-strides';
    const workoutDetails = WORKOUT_DETAILS[workout.type];

    return `
      <h2>${workout.name}</h2>
      ${targetMiles > 0 ? `<p class="target-miles">Target: ${targetMiles} miles</p>` : ''}
      <p class="workout-notes">${workoutDetails.notes}</p>
      ${this.renderRunInputs(log)}
      ${hasStrides ? this.renderStridesInput(log) : ''}
    `;
  },

  renderRunInputs(log) {
    const run = log?.run || { distance: '', duration: '', avgHR: '' };
    return `
      <div class="run-inputs">
        <div class="input-group">
          <label>Distance (miles)</label>
          <input type="number" step="0.1" id="run-distance" value="${run.distance}" placeholder="0.0">
        </div>
        <div class="input-group">
          <label>Duration (min)</label>
          <input type="number" id="run-duration" value="${run.duration}" placeholder="0">
        </div>
        <div class="input-group">
          <label>Avg HR (bpm)</label>
          <input type="number" id="run-avghr" value="${run.avgHR}" placeholder="0">
        </div>
      </div>
    `;
  },

  renderStridesInput(log) {
    const stridesCompleted = log?.strides?.completed || false;
    const stridesCount = log?.strides?.count || 6;
    return `
      <div class="strides-input">
        <label class="routine-checkbox">
          <input type="checkbox" id="strides-completed" ${stridesCompleted ? 'checked' : ''}>
          <span>Strides completed</span>
        </label>
        <div class="input-group">
          <label>Count</label>
          <input type="number" id="strides-count" value="${stridesCount}" min="0" max="12">
        </div>
      </div>
    `;
  },

  setupTodayViewListeners() {
    // Date navigation
    const prevBtn = document.getElementById('prev-day');
    const nextBtn = document.getElementById('next-day');
    if (prevBtn) prevBtn.addEventListener('click', () => this.navigateDay(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.navigateDay(1));

    // Daily routines
    const morningCheck = document.getElementById('morning-routine');
    const eveningCheck = document.getElementById('evening-routine');
    if (morningCheck) morningCheck.addEventListener('change', () => this.saveRoutines());
    if (eveningCheck) eveningCheck.addEventListener('change', () => this.saveRoutines());

    // Notes
    const notesInput = document.getElementById('notes-input');
    if (notesInput) {
      notesInput.addEventListener('blur', () => this.saveNotes());
    }

    // Actions
    const completeBtn = document.getElementById('btn-complete');
    const skipBtn = document.getElementById('btn-skip');
    const incompleteBtn = document.getElementById('btn-mark-incomplete');
    const unskipBtn = document.getElementById('btn-unskip');

    if (completeBtn) completeBtn.addEventListener('click', () => this.completeWorkout());
    if (skipBtn) skipBtn.addEventListener('click', () => this.skipWorkout());
    if (incompleteBtn) incompleteBtn.addEventListener('click', () => this.markIncomplete());
    if (unskipBtn) unskipBtn.addEventListener('click', () => this.unskipWorkout());

    // Phase 2: Tap-to-Record Sets
    this.setupTapToRecordListeners();

    // Run inputs
    const runInputs = ['run-distance', 'run-duration', 'run-avghr'];
    runInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) input.addEventListener('change', () => this.saveRunData());
    });

    // Strides
    const stridesCheck = document.getElementById('strides-completed');
    const stridesCount = document.getElementById('strides-count');
    if (stridesCheck) stridesCheck.addEventListener('change', () => this.saveStridesData());
    if (stridesCount) stridesCount.addEventListener('change', () => this.saveStridesData());

    // Exercise detail - click exercise name to open detail page
    const clickableExercises = document.querySelectorAll('.clickable-exercise');
    console.log('Found clickable exercises:', clickableExercises.length);

    clickableExercises.forEach((header, index) => {
      console.log(`Adding click listener to exercise ${index}`);
      header.addEventListener('click', function(e) {
        console.log('Click event fired!', e.target, this);
        e.preventDefault();
        e.stopPropagation();

        // Use 'this' which is the .clickable-exercise element we attached the listener to
        const exerciseItem = this.closest('.exercise-item');
        if (!exerciseItem) {
          console.log('No exercise item found');
          return;
        }

        const exerciseId = exerciseItem.dataset.exerciseId;
        const exerciseName = exerciseItem.dataset.exerciseName;

        console.log('Opening exercise detail:', exerciseId, exerciseName);

        // Get the exercise definition from WORKOUT_DETAILS
        const workout = App.getScheduledWorkout(App.currentDate);
        const info = App.getProgramInfo(App.currentDate);
        const phaseKey = `phase${info.phase}`;
        const workoutDetails = WORKOUT_DETAILS[workout.type]?.[phaseKey];
        const exercise = workoutDetails?.exercises.find(ex => ex.id === exerciseId);

        if (exercise) {
          console.log('Found exercise, calling openExerciseDetail');
          App.openExerciseDetail(exerciseId, exerciseName, exercise);
        } else {
          console.error('Exercise not found:', exerciseId);
        }
      });
    });
  },

  setupTapToRecordListeners() {
    const setButtons = document.querySelectorAll('.set-button:not(.add-set-button)');
    const addSetButtons = document.querySelectorAll('.add-set-button');

    // Setup long-press and tap listeners for regular set buttons
    setButtons.forEach(button => {
      let lastTapTime = 0;
      let longPressTimer = null;
      let longPressTriggered = false;

      const startLongPress = (e) => {
        longPressTriggered = false;
        longPressTimer = setTimeout(() => {
          longPressTriggered = true;
          this.openSetPicker(button);
        }, 500);
      };

      const cancelLongPress = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      button.addEventListener('touchstart', startLongPress);
      button.addEventListener('mousedown', startLongPress);

      button.addEventListener('touchend', cancelLongPress);
      button.addEventListener('touchcancel', cancelLongPress);
      button.addEventListener('mouseup', cancelLongPress);
      button.addEventListener('mouseleave', cancelLongPress);

      button.addEventListener('click', (e) => {
        e.preventDefault();

        // If long press was triggered, don't handle the click
        if (longPressTriggered) {
          longPressTriggered = false;
          return;
        }

        const now = Date.now();
        const timeSinceLastTap = now - lastTapTime;
        lastTapTime = now;

        const exerciseItem = button.closest('.exercise-item');
        const setIndex = parseInt(button.dataset.set);
        const target = parseInt(button.dataset.target);
        const isTimeBased = button.dataset.timeBased === 'true';
        const isCompleted = button.dataset.completed === 'true';
        const isExtra = button.dataset.isExtra === 'true';

        // Delayed tap on completed set - clear/undo (>500ms)
        // For extra sets, delayed tap removes the set
        if (isCompleted && timeSinceLastTap > 500) {
          if (isExtra) {
            this.removeExtraSet(exerciseItem, setIndex);
          } else {
            this.clearSet(button, exerciseItem, setIndex);
          }
          return;
        }

        // Rapid tap - decrement (<500ms)
        if (timeSinceLastTap < 500 && timeSinceLastTap > 0) {
          const currentValue = parseInt(button.textContent) || target;
          const decrementAmount = isTimeBased ? 5 : 1;
          const newValue = Math.max(0, currentValue - decrementAmount);

          button.textContent = newValue + (isTimeBased ? 's' : '');
          button.dataset.actual = newValue;

          if (newValue === 0) {
            button.classList.remove('completed');
            button.dataset.completed = 'false';
          } else {
            button.classList.add('completed');
            button.dataset.completed = 'true';
            // Phase 3: Start rest timer when set becomes completed
            this.startRestTimer();
          }

          this.saveSetData(exerciseItem, setIndex, newValue, true, isTimeBased);
        }
        // Single tap - mark complete at target
        else {
          button.classList.add('completed');
          button.dataset.completed = 'true';
          button.dataset.actual = target;
          button.textContent = target + (isTimeBased ? 's' : '');

          this.saveSetData(exerciseItem, setIndex, target, true, isTimeBased);

          // Phase 3: Start rest timer
          this.startRestTimer();
        }
      });
    });

    // Setup + button listeners
    addSetButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.addExtraSet(button);
      });
    });
  },

  openSetPicker(button) {
    const target = parseInt(button.dataset.target);
    const isTimeBased = button.dataset.timeBased === 'true';
    const maxValue = isTimeBased ? 180 : 50; // 3 minutes or 50 reps

    // Create picker overlay
    const picker = document.createElement('div');
    picker.className = 'set-picker-overlay';
    picker.innerHTML = `
      <div class="set-picker-backdrop"></div>
      <div class="set-picker-drawer">
        <div class="set-picker-header">
          <h3>Select ${isTimeBased ? 'Duration' : 'Reps'}</h3>
          <button class="set-picker-close">×</button>
        </div>
        <div class="set-picker-scroll">
          ${this.renderPickerOptions(target, maxValue, isTimeBased)}
        </div>
        <button class="set-picker-confirm">Confirm</button>
      </div>
    `;

    document.body.appendChild(picker);

    // Scroll to target value
    setTimeout(() => {
      const targetOption = picker.querySelector(`.picker-option[data-value="${target}"]`);
      if (targetOption) {
        targetOption.scrollIntoView({ block: 'center', behavior: 'smooth' });
        targetOption.classList.add('selected');
      }
    }, 100);

    // Store reference to button
    picker.dataset.buttonElement = button;

    // Setup picker listeners
    this.setupPickerListeners(picker, button);
  },

  renderPickerOptions(startValue, maxValue, isTimeBased) {
    const options = [];
    const increment = isTimeBased ? 5 : 1;

    for (let i = increment; i <= maxValue; i += increment) {
      const label = isTimeBased ? `${i}s` : i;
      const selectedClass = i === startValue ? 'selected' : '';
      options.push(`
        <div class="picker-option ${selectedClass}" data-value="${i}">
          ${label}
        </div>
      `);
    }

    return options.join('');
  },

  setupPickerListeners(picker, button) {
    const backdrop = picker.querySelector('.set-picker-backdrop');
    const closeBtn = picker.querySelector('.set-picker-close');
    const confirmBtn = picker.querySelector('.set-picker-confirm');
    const options = picker.querySelectorAll('.picker-option');

    const closePicker = () => {
      picker.remove();
    };

    backdrop.addEventListener('click', closePicker);
    closeBtn.addEventListener('click', closePicker);

    // Select option on click
    options.forEach(option => {
      option.addEventListener('click', () => {
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    confirmBtn.addEventListener('click', () => {
      const selectedOption = picker.querySelector('.picker-option.selected');
      if (selectedOption) {
        const value = parseInt(selectedOption.dataset.value);
        this.applyPickerValue(button, value);
      }
      closePicker();
    });
  },

  applyPickerValue(button, value) {
    const exerciseItem = button.closest('.exercise-item');
    const setIndex = parseInt(button.dataset.set);
    const isTimeBased = button.dataset.timeBased === 'true';

    button.classList.add('completed');
    button.dataset.completed = 'true';
    button.dataset.actual = value;
    button.textContent = value + (isTimeBased ? 's' : '');

    this.saveSetData(exerciseItem, setIndex, value, true, isTimeBased);

    // Phase 3: Start rest timer
    this.startRestTimer();
  },

  addExtraSet(addButton) {
    const exerciseItem = addButton.closest('.exercise-item');
    const exerciseId = exerciseItem.dataset.exerciseId;
    const target = parseInt(addButton.dataset.target);
    const isTimeBased = addButton.dataset.timeBased === 'true';

    // Get current log
    const log = Storage.getLog(this.currentDate) || {};
    if (!log.exercises) log.exercises = {};
    if (!log.exercises[exerciseId]) {
      log.exercises[exerciseId] = { sets: [] };
    }

    // Add new empty set
    const newSetIndex = log.exercises[exerciseId].sets.length;
    log.exercises[exerciseId].sets.push({
      reps: '',
      completed: false
    });

    Storage.saveLog(this.currentDate, log);

    // Re-render the today view to show the new set
    this.renderView('today');
  },

  removeExtraSet(exerciseItem, setIndex) {
    const exerciseId = exerciseItem.dataset.exerciseId;
    const log = Storage.getLog(this.currentDate) || {};

    if (!log.exercises || !log.exercises[exerciseId]) return;

    // Remove the set from the array
    log.exercises[exerciseId].sets.splice(setIndex, 1);

    Storage.saveLog(this.currentDate, log);

    // Re-render the today view
    this.renderView('today');
  },

  clearSet(button, exerciseItem, setIndex) {
    const target = parseInt(button.dataset.target);
    const isTimeBased = button.dataset.timeBased === 'true';

    button.classList.remove('completed');
    button.dataset.completed = 'false';
    button.dataset.actual = '';
    button.textContent = target + (isTimeBased ? 's' : '');

    this.saveSetData(exerciseItem, setIndex, '', false, isTimeBased);
  },

  saveSetData(exerciseItem, setIndex, value, completed, isTimeBased) {
    const exerciseId = exerciseItem.dataset.exerciseId;
    const log = Storage.getLog(this.currentDate) || {};

    if (!log.exercises) log.exercises = {};
    if (!log.exercises[exerciseId]) {
      log.exercises[exerciseId] = { sets: [] };
    }

    // Ensure sets array is large enough
    while (log.exercises[exerciseId].sets.length <= setIndex) {
      log.exercises[exerciseId].sets.push({ reps: '', completed: false });
    }

    // Update the specific set
    if (isTimeBased) {
      log.exercises[exerciseId].sets[setIndex] = {
        seconds: value,
        completed: completed
      };
    } else {
      log.exercises[exerciseId].sets[setIndex] = {
        reps: value,
        completed: completed
      };
    }

    // Get weight from exercise detail storage
    const weight = Storage.getExerciseWeight(exerciseId);
    if (weight) {
      log.exercises[exerciseId].weight = weight;
    }

    Storage.saveLog(this.currentDate, log);
  },

  navigateDay(delta) {
    this.currentDate = this.addDays(this.currentDate, delta);
    this.stopRestTimer(); // Clear timer when changing days
    this.renderView('today');
  },

  saveRoutines() {
    const morning = document.getElementById('morning-routine')?.checked || false;
    const evening = document.getElementById('evening-routine')?.checked || false;
    Storage.saveDailyRoutines(this.currentDate, { morning, evening });
  },

  saveNotes() {
    const notes = document.getElementById('notes-input')?.value || '';
    const log = Storage.getLog(this.currentDate) || {};
    log.notes = notes;
    Storage.saveLog(this.currentDate, log);
  },

  saveExerciseData() {
    const log = Storage.getLog(this.currentDate) || {};
    if (!log.exercises) log.exercises = {};

    document.querySelectorAll('.exercise-item').forEach(item => {
      const exerciseId = item.dataset.exerciseId;
      const sets = [];
      let weight = null;

      item.querySelectorAll('.set-row').forEach(row => {
        const weightInput = row.querySelector('[data-field="weight"]');
        const repsInput = row.querySelector('[data-field="reps"]');

        if (weightInput) {
          // Weighted exercise - store weight once at exercise level
          if (!weight) weight = weightInput.value;
          sets.push({
            reps: repsInput?.value || '',
            completed: Boolean(repsInput?.value)
          });
        } else {
          // Bodyweight or time-based - just reps
          sets.push({
            reps: repsInput?.value || '',
            completed: Boolean(repsInput?.value)
          });
        }
      });

      log.exercises[exerciseId] = { sets };
      if (weight) {
        log.exercises[exerciseId].weight = weight;
        // Also update global exercise weight
        Storage.setExerciseWeight(exerciseId, weight);
      }
    });

    Storage.saveLog(this.currentDate, log);
  },

  saveRunData() {
    const log = Storage.getLog(this.currentDate) || {};
    log.run = {
      distance: document.getElementById('run-distance')?.value || '',
      duration: document.getElementById('run-duration')?.value || '',
      avgHR: document.getElementById('run-avghr')?.value || ''
    };
    Storage.saveLog(this.currentDate, log);
  },

  saveStridesData() {
    const log = Storage.getLog(this.currentDate) || {};
    log.strides = {
      completed: document.getElementById('strides-completed')?.checked || false,
      count: document.getElementById('strides-count')?.value || 6
    };
    Storage.saveLog(this.currentDate, log);
  },

  completeWorkout() {
    const workout = this.getScheduledWorkout(this.currentDate);
    const log = Storage.getLog(this.currentDate) || {};

    log.scheduled = workout;
    log.completed = true;
    log.skipped = false;

    // Save any current form data (exercise data is now saved on tap)
    this.saveRunData();
    this.saveStridesData();
    this.saveNotes();

    Storage.saveLog(this.currentDate, log);
    this.renderView('today');
  },

  skipWorkout() {
    const workout = this.getScheduledWorkout(this.currentDate);
    const log = Storage.getLog(this.currentDate) || {};

    log.scheduled = workout;
    log.completed = false;
    log.skipped = true;

    Storage.saveLog(this.currentDate, log);
    this.renderView('today');
  },

  markIncomplete() {
    const log = Storage.getLog(this.currentDate) || {};
    log.completed = false;
    Storage.saveLog(this.currentDate, log);
    this.renderView('today');
  },

  unskipWorkout() {
    const log = Storage.getLog(this.currentDate) || {};
    log.skipped = false;
    Storage.saveLog(this.currentDate, log);
    this.renderView('today');
  },

  // WEEK VIEW
  renderWeekView() {
    const weekStart = this.getWeekStart(this.currentDate);
    const info = this.getProgramInfo(weekStart);

    if (info.status !== 'active') {
      return '<div class="week-view"><p>No program data for this week</p></div>';
    }

    const weekEnd = this.addDays(weekStart, 6);
    const mileageTarget = MILEAGE_TARGETS[info.week] || { total: 0 };

    let actualMiles = 0;
    let workoutsCompleted = 0;
    let workoutsTotal = 0;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dateString = this.addDays(weekStart, i);
      const workout = this.getScheduledWorkout(dateString);
      const log = Storage.getLog(dateString);

      if (workout && workout.type !== 'rest' && workout.type !== 'optional') {
        workoutsTotal++;
        if (log?.completed) workoutsCompleted++;
      }

      if (log?.run?.distance) {
        actualMiles += parseFloat(log.run.distance);
      }

      let status = '○';
      if (log?.completed) status = '✓';
      else if (log?.skipped) status = '✗';
      else if (this.getDaysBetween(dateString, this.getTodayDateString()) < 0) status = '◐';

      let typeClass = 'day-rest';
      if (workout) {
        if (workout.type.includes('lift')) typeClass = 'day-lift';
        else if (workout.type.includes('run')) typeClass = 'day-run';
      }

      const dayName = this.formatDisplayDate(dateString).split(',')[0];
      const month = this.formatDisplayDate(dateString).split(' ')[1];
      const day = dateString.split('-')[2];
      const workoutName = workout ? workout.name : 'Rest';

      days.push(`
        <div class="week-day ${typeClass}" data-date="${dateString}">
          <div class="day-left">
            <div class="day-name">${dayName}</div>
            <div class="day-date">${month} ${day}</div>
          </div>
          <div class="day-middle">
            <div class="day-workout">${workoutName}</div>
          </div>
          <div class="day-right">
            <div class="day-status">${status}</div>
          </div>
        </div>
      `);
    }

    return `
      <div class="week-view">
        <div class="week-header">
          <div class="week-nav">
            <button class="btn-icon" id="prev-week">&larr;</button>
            <div class="week-title">
              <h2>Week ${info.week} of 21</h2>
              <p>${PROGRAM.phases[info.phase - 1].name}</p>
              <p class="week-dates">${this.formatDisplayDate(weekStart)} - ${this.formatDisplayDate(weekEnd)}</p>
            </div>
            <button class="btn-icon" id="next-week">&rarr;</button>
          </div>
        </div>

        <div class="week-days">
          ${days.join('')}
        </div>

        <div class="week-summary">
          ${mileageTarget.total > 0 ? `
            <div class="summary-item">
              <span class="summary-label">Mileage:</span>
              <span class="summary-value">${actualMiles.toFixed(1)} / ${mileageTarget.total} miles</span>
            </div>
          ` : ''}
          <div class="summary-item">
            <span class="summary-label">Workouts:</span>
            <span class="summary-value">${workoutsCompleted} / ${workoutsTotal} completed</span>
          </div>
        </div>
      </div>
    `;
  },

  setupWeekViewListeners() {
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');
    if (prevBtn) prevBtn.addEventListener('click', () => this.navigateWeek(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.navigateWeek(1));

    document.querySelectorAll('.week-day').forEach(day => {
      day.addEventListener('click', () => {
        this.currentDate = day.dataset.date;
        this.renderView('today');
      });
    });
  },

  navigateWeek(delta) {
    this.currentDate = this.addDays(this.currentDate, delta * 7);
    this.renderView('week');
  },

  // SETTINGS VIEW
  renderSettingsView() {
    const startDate = Storage.getStartDate();

    return `
      <div class="settings-view">
        <h2>Settings</h2>

        <div class="setting-item">
          <label for="start-date-input">Program Start Date (Monday)</label>
          <input type="date" id="start-date-input" value="${startDate}">
          <button class="btn btn-primary" id="btn-save-start-date">Save Start Date</button>
        </div>

        <div class="setting-item">
          <h3>Data Management</h3>
          <button class="btn btn-danger" id="btn-reset-data">Reset All Data</button>
          <p class="setting-note">This will delete all logged workouts and reset the app.</p>
        </div>

        <div class="setting-item">
          <h3>About</h3>
          <p>CIM Marathon Training App v1.0</p>
          <p>5-month foundation and base building program</p>
        </div>
      </div>
    `;
  },

  setupSettingsViewListeners() {
    const saveStartDateBtn = document.getElementById('btn-save-start-date');
    const resetBtn = document.getElementById('btn-reset-data');

    if (saveStartDateBtn) {
      saveStartDateBtn.addEventListener('click', () => {
        const input = document.getElementById('start-date-input');
        if (input && input.value) {
          Storage.setStartDate(input.value);
          alert('Start date saved!');
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure? This will delete ALL your logged data. This cannot be undone.')) {
          Storage.resetToDefault();
          alert('All data has been reset.');
          this.renderView('settings');
        }
      });
    }
  },

  // EXERCISE DETAIL VIEW

  openExerciseDetail(exerciseId, exerciseName, exercise) {
    this.previousView = this.currentView;
    this.exerciseDetail = {
      exerciseId,
      exerciseName,
      exercise,
      tab: 'weight'
    };
    this.renderView('exercise-detail');
  },

  closeExerciseDetail() {
    const view = this.previousView || 'today';
    this.exerciseDetail = null;
    this.renderView(view);
  },

  renderExerciseDetailView() {
    if (!this.exerciseDetail) return '<div>No exercise selected</div>';

    const { exerciseId, exerciseName, exercise } = this.exerciseDetail;
    const weight = Storage.getExerciseWeight(exerciseId);
    const isBodyweight = exercise.bodyweight;
    const isTimeBased = typeof exercise.reps === 'string' && (exercise.reps.includes('sec') || exercise.reps.includes('min'));

    return `
      <div class="exercise-detail-page">
        <div class="exercise-detail-header">
          <button class="back-button" id="back-to-workout">← Back</button>
          <div class="exercise-detail-title">
            <h2>${exerciseName}</h2>
          </div>
        </div>

        <div class="exercise-detail-tabs">
          <button class="tab-button active" data-tab="weight">Weight</button>
          <button class="tab-button" data-tab="progress">Progress</button>
          <button class="tab-button" data-tab="history">History</button>
        </div>

        <div class="exercise-detail-content">
          ${this.renderExerciseDetailTab('weight', exerciseId, exercise)}
        </div>
      </div>
    `;
  },

  renderExerciseDetailTab(tab, exerciseId, exercise) {
    switch(tab) {
      case 'weight':
        return this.renderWeightTab(exerciseId, exercise);
      case 'progress':
        return this.renderProgressTab(exerciseId, exercise);
      case 'history':
        return this.renderHistoryTab(exerciseId, exercise);
      default:
        return '';
    }
  },

  renderWeightTab(exerciseId, exercise) {
    const isBodyweight = exercise.bodyweight;
    const isTimeBased = typeof exercise.reps === 'string' && (exercise.reps.includes('sec') || exercise.reps.includes('min'));
    let weight = Storage.getExerciseWeight(exerciseId);

    // If no weight stored, use a default based on exercise
    if (!weight) {
      weight = 135; // Default starting weight
      Storage.setExerciseWeight(exerciseId, weight);
    }

    const setsReps = `${exercise.sets}×${exercise.reps}`;

    if (isBodyweight && !isTimeBased) {
      return `
        <div class="weight-tab bodyweight">
          <div class="sets-reps-display">${setsReps}</div>
          <p>Bodyweight exercise - no weight adjustment needed</p>
        </div>
      `;
    }

    if (isTimeBased) {
      const targetSeconds = parseInt(exercise.reps) || 60;
      return `
        <div class="weight-tab time-based">
          <div class="sets-duration-display">${exercise.sets}×${exercise.reps}</div>
          <div class="time-adjuster">
            <button class="time-btn" data-action="decrease">-5</button>
            <div class="time-display" id="time-value">${targetSeconds} sec</div>
            <button class="time-btn" data-action="increase">+5</button>
          </div>
        </div>
      `;
    }

    // Weighted exercise
    const plates = this.calculatePlates(weight);

    return `
      <div class="weight-tab weighted">
        <div class="sets-reps-display">${setsReps}</div>

        <div class="plate-visualization">
          ${this.renderPlateBar(plates)}
        </div>

        <div class="weight-adjuster">
          <button class="weight-btn" data-action="decrease">-5</button>
          <div class="weight-display" id="weight-value">${weight} lb</div>
          <button class="weight-btn" data-action="increase">+5</button>
        </div>
      </div>
    `;
  },

  calculatePlates(totalWeight) {
    const barWeight = 45;
    const weightPerSide = (totalWeight - barWeight) / 2;

    const availablePlates = [
      { weight: 45, color: '#4285F4', name: '45' },
      { weight: 35, color: '#FBBC04', name: '35' },
      { weight: 25, color: '#0F9D58', name: '25' },
      { weight: 15, color: '#333', name: '15' },
      { weight: 10, color: '#333', name: '10' },
      { weight: 5, color: '#4285F4', name: '5' },
      { weight: 2.5, color: '#0F9D58', name: '2.5' },
      { weight: 1.25, color: '#fff', name: '1.25', border: true }
    ];

    const plates = [];
    let remaining = weightPerSide;

    for (const plate of availablePlates) {
      while (remaining >= plate.weight) {
        plates.push(plate);
        remaining -= plate.weight;
      }
    }

    return plates;
  },

  renderPlateBar(plates) {
    if (plates.length === 0) {
      return '<div class="plate-bar"><div class="bar-only">45 lb bar</div></div>';
    }

    const plateHTML = plates.map(plate => {
      const style = plate.border
        ? `background: ${plate.color}; border: 2px solid #333;`
        : `background: ${plate.color};`;
      return `<div class="plate" style="${style}">${plate.name}</div>`;
    }).join('');

    return `
      <div class="plate-bar">
        <div class="plates-left">${plateHTML}</div>
        <div class="bar">45</div>
        <div class="plates-right">${plateHTML}</div>
      </div>
    `;
  },

  renderProgressTab(exerciseId, exercise) {
    const history = Storage.getExerciseHistory(exerciseId);
    const isBodyweight = exercise.bodyweight;
    const isTimeBased = typeof exercise.reps === 'string' && (exercise.reps.includes('sec') || exercise.reps.includes('min'));

    if (history.length === 0) {
      return '<div class="progress-tab"><p>No data yet. Complete some workouts to see your progress!</p></div>';
    }

    if (!isBodyweight && !isTimeBased) {
      // Weighted exercise - line charts
      return `
        <div class="progress-tab">
          <h3>Weight Over Time</h3>
          ${this.renderWeightChart(history)}

          <h3>Estimated 1RM Over Time</h3>
          ${this.renderE1RMChart(history)}
        </div>
      `;
    } else {
      // Bodyweight/Time-based - horizontal bar chart
      return `
        <div class="progress-tab">
          <h3>${isTimeBased ? 'Duration' : 'Reps'} Over Time</h3>
          ${this.renderRepsBarChart(history, isTimeBased)}
        </div>
      `;
    }
  },

  renderWeightChart(history) {
    const recentHistory = history.slice(-12); // Last 12 sessions
    if (recentHistory.length === 0) return '<p>No data</p>';

    const maxWeight = Math.max(...recentHistory.map(h => h.weight || 0));
    const minWeight = Math.min(...recentHistory.map(h => h.weight || maxWeight));
    const range = maxWeight - minWeight || 10;

    const points = recentHistory.map((entry, i) => {
      const x = (i / (recentHistory.length - 1)) * 100;
      const y = 100 - ((entry.weight - minWeight) / range) * 80;
      return `${x},${y}`;
    }).join(' ');

    return `
      <svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points="${points}" fill="none" stroke="#4285F4" stroke-width="2" vector-effect="non-scaling-stroke"/>
        ${recentHistory.map((entry, i) => {
          const x = (i / (recentHistory.length - 1)) * 100;
          const y = 100 - ((entry.weight - minWeight) / range) * 80;
          return `<circle cx="${x}" cy="${y}" r="3" fill="#4285F4" vector-effect="non-scaling-stroke"/>`;
        }).join('')}
      </svg>
      <div class="chart-labels">
        <span>${minWeight} lb</span>
        <span>${maxWeight} lb</span>
      </div>
    `;
  },

  renderE1RMChart(history) {
    const recentHistory = history.slice(-12);
    if (recentHistory.length === 0) return '<p>No data</p>';

    const historyWithE1RM = recentHistory.map(entry => {
      const bestSet = entry.sets?.reduce((best, set) =>
        (set.reps > (best?.reps || 0)) ? set : best
      , null);
      const e1rm = bestSet ? this.calculateE1RM(entry.weight, bestSet.reps) : 0;
      return { ...entry, e1rm };
    });

    const maxE1RM = Math.max(...historyWithE1RM.map(h => h.e1rm));
    const minE1RM = Math.min(...historyWithE1RM.map(h => h.e1rm || maxE1RM));
    const range = maxE1RM - minE1RM || 10;

    const points = historyWithE1RM.map((entry, i) => {
      const x = (i / (historyWithE1RM.length - 1)) * 100;
      const y = 100 - ((entry.e1rm - minE1RM) / range) * 80;
      return `${x},${y}`;
    }).join(' ');

    return `
      <svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points="${points}" fill="none" stroke="#0F9D58" stroke-width="2" vector-effect="non-scaling-stroke"/>
        ${historyWithE1RM.map((entry, i) => {
          const x = (i / (historyWithE1RM.length - 1)) * 100;
          const y = 100 - ((entry.e1rm - minE1RM) / range) * 80;
          return `<circle cx="${x}" cy="${y}" r="3" fill="#0F9D58" vector-effect="non-scaling-stroke"/>`;
        }).join('')}
      </svg>
      <div class="chart-labels">
        <span>${Math.round(minE1RM)} lb</span>
        <span>${Math.round(maxE1RM)} lb</span>
      </div>
    `;
  },

  calculateE1RM(weight, reps) {
    // Brzycki formula: e1RM = weight × (36 / (37 - reps))
    if (reps >= 37) return weight; // Formula breaks down at high reps
    return weight * (36 / (37 - reps));
  },

  renderRepsBarChart(history, isTimeBased) {
    const recentHistory = history.slice(-12);
    if (recentHistory.length === 0) return '<p>No data</p>';

    const maxValue = Math.max(...recentHistory.flatMap(h =>
      h.sets?.map(s => s.reps || s.seconds || 0) || [0]
    ));

    return `
      <div class="bar-chart">
        ${recentHistory.reverse().map((entry, i) => {
          const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const bgColor = i % 2 === 0 ? '#f5f5f5' : '#fff';

          return `
            <div class="bar-row" style="background: ${bgColor}">
              <div class="bar-date">${date}</div>
              <div class="bar-sets">
                ${entry.sets?.map(set => {
                  const value = set.reps || set.seconds || 0;
                  const width = (value / maxValue) * 100;
                  return `<div class="bar" style="width: ${width}%">${value}</div>`;
                }).join('') || '<div class="bar-empty">-</div>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderHistoryTab(exerciseId, exercise) {
    const history = Storage.getExerciseHistory(exerciseId);
    const isBodyweight = exercise.bodyweight;
    const isTimeBased = typeof exercise.reps === 'string' && (exercise.reps.includes('sec') || exercise.reps.includes('min'));

    if (history.length === 0) {
      return '<div class="history-tab"><p>No history yet</p></div>';
    }

    let tableHeaders = '';
    let tableRows = '';

    if (!isBodyweight && !isTimeBased) {
      // Weighted exercise
      tableHeaders = '<th>Date</th><th>Weight</th><th>Reps</th><th>e1RM</th>';
      tableRows = history.reverse().map(entry => {
        const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const repsDisplay = this.formatRepsDisplay(entry.sets);
        const bestSet = entry.sets?.reduce((best, set) =>
          (set.reps > (best?.reps || 0)) ? set : best
        , null);
        const e1rm = bestSet ? Math.round(this.calculateE1RM(entry.weight, bestSet.reps)) : '-';

        return `
          <tr>
            <td>${date}</td>
            <td>${entry.weight} lb</td>
            <td>${repsDisplay}</td>
            <td>${e1rm} lb</td>
          </tr>
        `;
      }).join('');
    } else if (isTimeBased) {
      // Time-based exercise
      tableHeaders = '<th>Date</th><th>Target</th><th>Actual</th>';
      tableRows = history.reverse().map(entry => {
        const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const target = `${exercise.sets}×${exercise.reps}`;
        const actual = entry.sets?.map(s => s.seconds || 0).join('/') || '-';

        return `
          <tr>
            <td>${date}</td>
            <td>${target}</td>
            <td>${actual}s</td>
          </tr>
        `;
      }).join('');
    } else {
      // Bodyweight exercise
      tableHeaders = '<th>Date</th><th>Reps</th>';
      tableRows = history.reverse().map(entry => {
        const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const reps = entry.sets?.map(s => s.reps || 0).join('/') || '-';

        return `
          <tr>
            <td>${date}</td>
            <td>${reps}</td>
          </tr>
        `;
      }).join('');
    }

    return `
      <div class="history-tab">
        <table class="history-table">
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  },

  formatRepsDisplay(sets) {
    if (!sets || sets.length === 0) return '-';
    const reps = sets.map(s => s.reps || 0);
    const allSame = reps.every(r => r === reps[0]);
    return allSame ? `${sets.length}×${reps[0]}` : reps.join('/');
  },

  setupExerciseDetailListeners() {
    const backBtn = document.getElementById('back-to-workout');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.closeExerciseDetail());
    }

    // Tab switching
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.exerciseDetail.tab = tab;

        // Update active state
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Render new tab content
        const { exerciseId, exercise } = this.exerciseDetail;
        document.querySelector('.exercise-detail-content').innerHTML =
          this.renderExerciseDetailTab(tab, exerciseId, exercise);

        // Re-setup listeners for new content
        this.setupWeightAdjustListeners();
      });
    });

    this.setupWeightAdjustListeners();
  },

  setupWeightAdjustListeners() {
    const { exerciseId, exercise } = this.exerciseDetail || {};
    if (!exerciseId) return;

    // Weight adjustment buttons
    document.querySelectorAll('.weight-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        let currentWeight = Storage.getExerciseWeight(exerciseId) || 135;

        if (action === 'increase') currentWeight += 5;
        if (action === 'decrease') currentWeight = Math.max(45, currentWeight - 5);

        Storage.setExerciseWeight(exerciseId, currentWeight);
        document.getElementById('weight-value').textContent = `${currentWeight} lb`;

        // Update plates
        const plates = this.calculatePlates(currentWeight);
        document.querySelector('.plate-visualization').innerHTML = this.renderPlateBar(plates);
      });
    });

    // Time adjustment buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const timeDisplay = document.getElementById('time-value');
        let currentTime = parseInt(timeDisplay.textContent) || 60;

        if (action === 'increase') currentTime += 5;
        if (action === 'decrease') currentTime = Math.max(5, currentTime - 5);

        timeDisplay.textContent = `${currentTime} sec`;
      });
    });
  },

  // PHASE 3: REST TIMER

  startRestTimer() {
    // Stop any existing timer
    this.stopRestTimer();

    // Start new timer
    this.restTimer.visible = true;
    this.restTimer.startTime = Date.now();

    // Update timer display
    this.updateRestTimerDisplay();

    // Start interval
    this.restTimer.interval = setInterval(() => {
      this.updateRestTimerDisplay();
    }, 1000);
  },

  stopRestTimer() {
    if (this.restTimer.interval) {
      clearInterval(this.restTimer.interval);
      this.restTimer.interval = null;
    }
    this.restTimer.visible = false;
    this.restTimer.startTime = null;

    // Remove timer element if it exists
    const timerElement = document.getElementById('rest-timer');
    if (timerElement) {
      timerElement.remove();
    }
  },

  updateRestTimerDisplay() {
    if (!this.restTimer.visible || !this.restTimer.startTime) return;

    const elapsed = Math.floor((Date.now() - this.restTimer.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Check if timer element exists
    let timerElement = document.getElementById('rest-timer');

    if (!timerElement) {
      // Create timer element
      timerElement = document.createElement('div');
      timerElement.id = 'rest-timer';
      timerElement.className = 'rest-timer';
      timerElement.innerHTML = `
        <span class="rest-timer-label">Rest:</span>
        <span class="rest-timer-time">${timeString}</span>
        <button class="rest-timer-dismiss">×</button>
      `;
      document.body.appendChild(timerElement);

      // Add dismiss listener
      const dismissBtn = timerElement.querySelector('.rest-timer-dismiss');
      dismissBtn.addEventListener('click', () => {
        this.stopRestTimer();
      });
    } else {
      // Update existing timer
      const timeDisplay = timerElement.querySelector('.rest-timer-time');
      if (timeDisplay) {
        timeDisplay.textContent = timeString;
      }
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
