// CIM Training App - Main Application Logic

const App = {
  currentView: 'today',
  currentDate: null,
  currentWeek: 1,
  exerciseDetail: null, // { exerciseId, exerciseName, exercise, tab: 'weight' }
  previousView: null, // For returning from exercise detail
  restTimer: { visible: false, startTime: null, interval: null }, // Phase 3: Rest timer
  dragState: {
    isDragging: false,
    draggedElement: null,
    draggedDayIndex: null,
    touchStartX: null,
    touchStartY: null,
    longPressTimer: null
  },

  _initComplete: false,

  init() {
    // Initialize storage — synchronous, loads from localStorage instantly
    Storage.initStorage();

    // Set current date
    this.currentDate = this.getTodayDateString();

    // Setup event listeners
    this.setupEventListeners();

    // Render initial view
    this.renderView('today');

    // Mark init complete
    this._initComplete = true;
    if (window._appSafetyTimer) clearTimeout(window._appSafetyTimer);

    // Register service worker after app is rendered
    this.registerServiceWorker();
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
                console.log('[App] New version available! Reloading in 2 seconds...');
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }
            });
          });
        })
        .catch(err => console.log('[App] Service Worker registration failed:', err));

      // Listen for controller change — only reload if app already rendered
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
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
      case 'library':
        contentArea.innerHTML = this.renderLibraryView();
        this.setupLibraryListeners();
        break;
      case 'running':
        contentArea.innerHTML = this.renderRunningView();
        this.setupRunningListeners();
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

        <div class="workout-notes">
          <label for="notes-input">Notes:</label>
          <textarea id="notes-input" rows="3" placeholder="Log notes about today's workout...">${log?.notes || ''}</textarea>
        </div>

        <div class="workout-actions">
          ${log?.completed ?
            '<button class="btn btn-secondary" id="btn-mark-incomplete">Mark Incomplete</button>' :
            '<button class="btn btn-primary" id="btn-complete">Complete</button>'
          }
          ${!log?.skipped ?
            '<button class="btn btn-secondary" id="btn-skip">Skip Workout</button>' :
            '<button class="btn btn-secondary" id="btn-unskip">Unskip Workout</button>'
          }
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

  // Get effective exercise with any custom sets/reps overrides applied
  getEffectiveExercise(exercise, phase) {
    const override = Storage.getExerciseSetsReps(exercise.id, phase);
    if (!override) return exercise;
    return {
      ...exercise,
      sets: override.sets ?? exercise.sets,
      reps: override.reps ?? exercise.reps
    };
  },

  renderLiftWorkout(workout, info, log) {
    const liftType = workout.type;
    const phaseKey = `phase${info.phase}`;
    const workoutDetails = WORKOUT_DETAILS[liftType]?.[phaseKey];

    if (!workoutDetails) {
      return `<h2>${workout.name}</h2><p>Workout details coming soon</p>`;
    }

    const exercises = workoutDetails.exercises.map(rawEx => {
      const ex = this.getEffectiveExercise(rawEx, info.phase);
      const exerciseLog = log?.exercises?.[ex.id] || {};
      const loggedSets = exerciseLog.sets || [];
      const loggedWeight = exerciseLog.weight || Storage.getExerciseWeight(ex.id) || '';
      const repsDisplay = typeof ex.reps === 'number' ? `${ex.reps} reps` : ex.reps;

      // Show weight if available, otherwise show sets x reps
      let metaDisplay;
      if (loggedWeight && !ex.bodyweight) {
        metaDisplay = `${loggedWeight} lbs`;
      } else {
        metaDisplay = `${ex.sets}x${repsDisplay}`;
      }

      return `
        <div class="exercise-item" data-exercise-id="${ex.id}" data-exercise-name="${ex.name}">
          <div class="exercise-header clickable-exercise">
            <div class="exercise-header-content">
              <h4>${ex.name} →</h4>
              <span class="exercise-target">${metaDisplay}</span>
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
        <p class="run-notes">${runDetails.notes}</p>
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
    const notes = typeof workoutDetails.notes === 'object'
      ? (workoutDetails.notes[`phase${info.phase}`] || workoutDetails.notes.default)
      : workoutDetails.notes;

    return `
      <h2>${workout.name}</h2>
      ${targetMiles > 0 ? `<p class="target-miles">Target: ${targetMiles} miles</p>` : ''}
      <p class="run-notes">${notes}</p>
      ${this.renderRunInputs(log)}
      ${hasStrides ? this.renderStridesInput(log) : ''}
    `;
  },

  renderRunInputs(log) {
    const run = log?.run || { distance: '', duration: '', avgHR: '' };
    // Convert legacy numeric duration to mm:ss display
    let durationDisplay = run.duration || '';
    if (durationDisplay && !durationDisplay.includes(':')) {
      const mins = Math.floor(parseFloat(durationDisplay));
      const secs = Math.round((parseFloat(durationDisplay) - mins) * 60);
      durationDisplay = `${mins}:${String(secs).padStart(2, '0')}`;
    }
    return `
      <div class="run-inputs">
        <div class="input-group">
          <label>Distance (mi)</label>
          <input type="number" step="0.1" id="run-distance" value="${run.distance}" placeholder="0.0" inputmode="decimal">
        </div>
        <div class="input-group">
          <label>Duration (mm:ss)</label>
          <input type="text" id="run-duration" value="${durationDisplay}" placeholder="00:00" inputmode="numeric" maxlength="5">
        </div>
        <div class="input-group">
          <label>Avg HR</label>
          <input type="number" id="run-avghr" value="${run.avgHR}" placeholder="0" inputmode="numeric">
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
          App.openExerciseDetail(exerciseId, exerciseName, exercise, info.phase);
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
        <button class="set-picker-confirm">Done</button>
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
    const durationRaw = document.getElementById('run-duration')?.value || '';
    // Auto-format: if user types just digits, insert colon (e.g. "2530" -> "25:30")
    let duration = durationRaw;
    if (duration && !duration.includes(':') && duration.length >= 2) {
      const secs = duration.slice(-2);
      const mins = duration.slice(0, -2) || '0';
      duration = `${mins}:${secs}`;
      const input = document.getElementById('run-duration');
      if (input) input.value = duration;
    }
    log.run = {
      distance: document.getElementById('run-distance')?.value || '',
      duration: duration,
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

    // Get the default workout schedule for this week (Mon=1, Tue=2, etc.)
    const phase = PROGRAM.phases[info.phase - 1];
    const weekTemplate = phase.weekTemplate;

    // Create array of default workout indices [1,2,3,4,5,6,7]
    const defaultWorkoutIndices = [1, 2, 3, 4, 5, 6, 7];

    // Load saved permutation - this reorders which WORKOUT appears on which day
    const permutation = Storage.getWeekReordering(weekStart);
    const workoutOrder = (permutation && Array.isArray(permutation) && permutation.length === 7)
      ? permutation.map(i => defaultWorkoutIndices[i])
      : defaultWorkoutIndices;

    const days = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      // Date is ALWAYS Mon-Sun in order
      const dateString = this.addDays(weekStart, dayIndex);

      // Workout comes from the reordered workout schedule
      const workoutDayNumber = workoutOrder[dayIndex];
      const workoutType = weekTemplate[workoutDayNumber];

      // Get workout details and log for this date
      // Use phase-specific name from WORKOUT_DETAILS when available (has descriptive subtitles)
      let workoutName = workoutType ? workoutType.name : null;
      if (workoutType && WORKOUT_DETAILS[workoutType.type]) {
        const phaseKey = `phase${info.phase}`;
        const details = WORKOUT_DETAILS[workoutType.type]?.[phaseKey];
        if (details?.name) workoutName = details.name;
      }
      const workout = workoutType ? { type: workoutType.type, name: workoutName } : null;
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
      const displayName = workout ? workoutName : 'Rest';

      days.push(`
        <div class="week-day ${typeClass}"
             data-date="${dateString}"
             data-day-index="${dayIndex}"
             data-workout-index="${workoutOrder.indexOf(workoutDayNumber)}"
             draggable="true">
          <div class="day-left">
            <div class="day-name">${dayName}</div>
            <div class="day-date">${month} ${day}</div>
          </div>
          <div class="day-middle">
            <div class="day-workout">${displayName}</div>
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
      // Mouse drag events (desktop)
      day.addEventListener('dragstart', (e) => this.handleDragStart(e));
      day.addEventListener('dragend', (e) => this.handleDragEnd(e));
      day.addEventListener('dragover', (e) => this.handleDragOver(e));
      day.addEventListener('dragenter', (e) => this.handleDragEnter(e));
      day.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      day.addEventListener('drop', (e) => this.handleDrop(e));

      // Touch events (mobile)
      day.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
      day.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
      day.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

      // Click navigation (check drag state)
      day.addEventListener('click', () => {
        // Don't navigate if drag just ended (100ms window)
        if (this.dragState.isDragging || Date.now() - (this.dragState.lastDragEnd || 0) < 100) {
          return;
        }
        this.currentDate = day.dataset.date;
        this.renderView('today');
      });
    });
  },

  navigateWeek(delta) {
    this.currentDate = this.addDays(this.currentDate, delta * 7);
    this.renderView('week');
  },

  // DRAG AND DROP HANDLERS (Mouse events for desktop)

  handleDragStart(e) {
    this.dragState.isDragging = true;
    this.dragState.draggedElement = e.target.closest('.week-day');
    this.dragState.draggedDayIndex = parseInt(this.dragState.draggedElement.dataset.dayIndex);
    this.dragState.draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.dragState.draggedElement.innerHTML);
  },

  handleDragEnd(e) {
    // Remove dragging class after a brief delay to prevent click interference
    setTimeout(() => {
      if (this.dragState.draggedElement) {
        this.dragState.draggedElement.classList.remove('dragging');
      }
      document.querySelectorAll('.week-day').forEach(day => {
        day.classList.remove('drag-over');
      });
      this.dragState.lastDragEnd = Date.now();
      this.dragState.isDragging = false;
      this.dragState.draggedElement = null;
      this.dragState.draggedDayIndex = null;
    }, 100);
  },

  handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault(); // Allow drop
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  },

  handleDragEnter(e) {
    const target = e.target.closest('.week-day');
    if (target && target !== this.dragState.draggedElement) {
      target.classList.add('drag-over');
    }
  },

  handleDragLeave(e) {
    const target = e.target.closest('.week-day');
    if (target) {
      target.classList.remove('drag-over');
    }
  },

  handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation(); // Prevent navigation
    }

    const dropTarget = e.target.closest('.week-day');
    if (!dropTarget || dropTarget === this.dragState.draggedElement) {
      return false;
    }

    const dropDayIndex = parseInt(dropTarget.dataset.dayIndex);
    const draggedDayIndex = this.dragState.draggedDayIndex;

    // Calculate new permutation
    const weekStart = this.getWeekStart(this.currentDate);
    const currentPermutation = Storage.getWeekReordering(weekStart) || [0, 1, 2, 3, 4, 5, 6];
    const newPermutation = [...currentPermutation];

    // Swap the workouts at these day positions
    [newPermutation[draggedDayIndex], newPermutation[dropDayIndex]] =
      [newPermutation[dropDayIndex], newPermutation[draggedDayIndex]];

    // Save and re-render
    Storage.saveWeekReordering(weekStart, newPermutation);
    this.renderView('week');

    return false;
  },

  // TOUCH EVENT HANDLERS (Mobile drag-and-drop)

  handleTouchStart(e) {
    const target = e.target.closest('.week-day');
    if (!target) return;

    this.dragState.touchStartX = e.touches[0].clientX;
    this.dragState.touchStartY = e.touches[0].clientY;
    this.dragState.draggedElement = target;
    this.dragState.draggedDayIndex = parseInt(target.dataset.dayIndex);

    // Start 200ms timer for long-press detection
    this.dragState.longPressTimer = setTimeout(() => {
      this.dragState.isDragging = true;
      this.dragState.draggedElement.classList.add('dragging');
      // Prevent page scroll during drag
      e.preventDefault();
    }, 200);
  },

  handleTouchMove(e) {
    const dx = e.touches[0].clientX - this.dragState.touchStartX;
    const dy = e.touches[0].clientY - this.dragState.touchStartY;
    const distance = Math.hypot(dx, dy);

    // Cancel drag initiation if user is scrolling (moved >10px before 200ms)
    if (!this.dragState.isDragging && distance > 10) {
      clearTimeout(this.dragState.longPressTimer);
      this.dragState.draggedElement = null;
      this.dragState.draggedDayIndex = null;
      return;
    }

    // If already dragging, update drop target indicator
    if (this.dragState.isDragging) {
      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropTarget = elementAtPoint?.closest('.week-day');

      // Clear all drag-over states
      document.querySelectorAll('.week-day').forEach(day => {
        day.classList.remove('drag-over');
      });

      // Add drag-over to current drop target
      if (dropTarget && dropTarget !== this.dragState.draggedElement) {
        dropTarget.classList.add('drag-over');
      }
    }
  },

  handleTouchEnd(e) {
    clearTimeout(this.dragState.longPressTimer);

    if (this.dragState.isDragging) {
      e.preventDefault(); // Prevent click event

      const touch = e.changedTouches[0];
      const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropTarget = elementAtPoint?.closest('.week-day');

      if (dropTarget && dropTarget !== this.dragState.draggedElement) {
        const dropDayIndex = parseInt(dropTarget.dataset.dayIndex);
        const draggedDayIndex = this.dragState.draggedDayIndex;

        // Calculate new permutation
        const weekStart = this.getWeekStart(this.currentDate);
        const currentPermutation = Storage.getWeekReordering(weekStart) || [0, 1, 2, 3, 4, 5, 6];
        const newPermutation = [...currentPermutation];

        // Swap the workouts at these day positions
        [newPermutation[draggedDayIndex], newPermutation[dropDayIndex]] =
          [newPermutation[dropDayIndex], newPermutation[draggedDayIndex]];

        // Save and re-render
        Storage.saveWeekReordering(weekStart, newPermutation);
        this.renderView('week');
      }

      // Cleanup
      this.dragState.draggedElement.classList.remove('dragging');
      document.querySelectorAll('.week-day').forEach(day => {
        day.classList.remove('drag-over');
      });
      this.dragState.lastDragEnd = Date.now();
    }

    // Reset drag state
    this.dragState.isDragging = false;
    this.dragState.draggedElement = null;
    this.dragState.draggedDayIndex = null;
    this.dragState.touchStartX = null;
    this.dragState.touchStartY = null;
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
          <h3>Backup & Restore</h3>
          <button class="btn btn-primary" id="btn-export-data">Export Backup</button>
          <p class="setting-note">Download all your data as a JSON file.</p>
          ${(() => {
            const lastExport = Storage.getLastExportDate();
            if (lastExport) {
              const d = new Date(lastExport);
              const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
              return `<p class="setting-note">Last exported: ${formatted}</p>`;
            }
            return '<p class="setting-note">No backups yet.</p>';
          })()}
          <button class="btn btn-secondary" id="btn-import-data" style="margin-top: 12px;">Import Backup</button>
          <input type="file" id="import-file-input" accept=".json,application/json" style="display: none;">
          <p class="setting-note">Restore from a previously exported backup file. This will replace all current data.</p>
        </div>

        <div class="setting-item">
          <h3>Data Management</h3>
          <button class="btn btn-danger" id="btn-reset-data">Reset All Data</button>
          <p class="setting-note">This will delete all logged workouts and reset the app.</p>
        </div>

        <p class="setting-note" style="text-align: center; margin-top: 24px;">v5.10</p>
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

    // Export backup
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const jsonString = Storage.exportAllData();
        if (!jsonString) {
          alert('No data to export.');
          return;
        }
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `cim-training-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // Re-render to show updated export timestamp
        this.renderView('settings');
      });
    }

    // Import backup
    const importBtn = document.getElementById('btn-import-data');
    const importInput = document.getElementById('import-file-input');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => {
        importInput.click();
      });

      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('This will replace ALL current data with the backup. Are you sure?')) {
          importInput.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = Storage.importData(event.target.result);
          alert(result.message);
          if (result.success) {
            this.renderView('settings');
          }
        };
        reader.onerror = () => {
          alert('Failed to read the file.');
        };
        reader.readAsText(file);
        importInput.value = '';
      });
    }
  },

  // EXERCISE DETAIL VIEW

  openExerciseDetail(exerciseId, exerciseName, exercise, phase) {
    this.previousView = this.currentView;
    this.exerciseDetail = {
      exerciseId,
      exerciseName,
      exercise,
      phase: phase || 1,
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

  // Exercise type metadata
  BARBELL_EXERCISES: ['low-bar-squat', 'bench-press', 'overhead-press', 'deadlift', 'barbell-row', 'front-squat', 'slow-tempo-squat', 'slow-tempo-front-squat'],
  SINGLE_ARM_EXERCISES: ['farmer-carry'],
  CABLE_EXERCISES: ['cable-pullthrough'],
  EXERCISE_INCREMENT: { 'overhead-press': 2.5 },

  getExerciseType(exerciseId) {
    if (this.BARBELL_EXERCISES.includes(exerciseId)) return 'barbell';
    if (this.SINGLE_ARM_EXERCISES.includes(exerciseId)) return 'single-arm';
    if (this.CABLE_EXERCISES.includes(exerciseId)) return 'cable';
    return 'other';
  },

  getWeightIncrement(exerciseId) {
    return this.EXERCISE_INCREMENT[exerciseId] || 5;
  },

  renderWeightTab(exerciseId, exercise) {
    const phase = this.exerciseDetail?.phase || 1;
    const effective = this.getEffectiveExercise(exercise, phase);
    const hasOverride = Storage.getExerciseSetsReps(exerciseId, phase) !== null;
    const isBodyweight = exercise.bodyweight;
    const isTimeBased = typeof effective.reps === 'string' && (effective.reps.includes('sec') || effective.reps.includes('min'));
    let weight = Storage.getExerciseWeight(exerciseId);

    // If no weight stored, use a default based on exercise
    if (!weight) {
      weight = 135; // Default starting weight
      Storage.setExerciseWeight(exerciseId, weight);
    }

    const setsReps = `${effective.sets}×${effective.reps}`;
    const overrideClass = hasOverride ? ' has-override' : '';
    const editorHtml = this.renderSetsRepsEditor(exercise, effective);
    const exerciseType = this.getExerciseType(exerciseId);
    const increment = this.getWeightIncrement(exerciseId);
    const isBarbell = exerciseType === 'barbell';
    const isSingleArm = exerciseType === 'single-arm';

    if (isBodyweight && !isTimeBased) {
      return `
        <div class="weight-tab bodyweight">
          <div class="sets-reps-display${overrideClass}" id="sets-reps-tap-target">${setsReps} <span class="edit-icon">&#9998;</span></div>
          <div class="sets-reps-editor" id="sets-reps-editor" style="display: none;">${editorHtml}</div>
        </div>
      `;
    }

    if (isTimeBased && isBodyweight) {
      return `
        <div class="weight-tab time-based">
          <div class="sets-reps-display${overrideClass}" id="sets-reps-tap-target">${setsReps} <span class="edit-icon">&#9998;</span></div>
          <div class="sets-reps-editor" id="sets-reps-editor" style="display: none;">${editorHtml}</div>
        </div>
      `;
    }

    // Weighted exercise (including time-based with weight like farmer carries)
    const weightLabel = `${weight} lb`;

    return `
      <div class="weight-tab weighted">
        <div class="sets-reps-display${overrideClass}" id="sets-reps-tap-target">${setsReps} <span class="edit-icon">&#9998;</span></div>
        <div class="sets-reps-editor" id="sets-reps-editor" style="display: none;">${editorHtml}</div>

        ${isBarbell ? `<div class="plate-visualization">${this.renderPlateBar(this.calculatePlates(weight))}</div>` : ''}

        <div class="weight-adjuster">
          <button class="weight-btn${increment % 1 !== 0 ? ' small-text' : ''}" data-action="decrease" data-increment="${increment}">-${increment}</button>
          <div class="weight-display" id="weight-value">${weightLabel}</div>
          <button class="weight-btn${increment % 1 !== 0 ? ' small-text' : ''}" data-action="increase" data-increment="${increment}">+${increment}</button>
        </div>
      </div>
    `;
  },

  renderSetsRepsEditor(originalExercise, effectiveExercise) {
    const isTimeBased = typeof effectiveExercise.reps === 'string' && (effectiveExercise.reps.includes('sec') || effectiveExercise.reps.includes('min'));
    const isMax = effectiveExercise.reps === 'max';

    const setsValue = effectiveExercise.sets;

    let repsRow = '';
    if (isMax) {
      repsRow = `
        <div class="sets-reps-edit-row">
          <span class="edit-label">Reps</span>
          <span class="edit-value edit-value-fixed" id="edit-reps-value" data-is-max="true">max</span>
        </div>
      `;
    } else if (isTimeBased) {
      const timeValue = parseInt(effectiveExercise.reps) || 60;
      const suffix = effectiveExercise.reps.includes('min') ? 'min' : 'sec';
      repsRow = `
        <div class="sets-reps-edit-row">
          <span class="edit-label">Time</span>
          <button class="edit-stepper-btn" data-field="reps" data-action="decrease">&minus;</button>
          <span class="edit-value" id="edit-reps-value" data-time-based="true" data-suffix="${suffix}">${timeValue}</span>
          <button class="edit-stepper-btn" data-field="reps" data-action="increase">+</button>
        </div>
      `;
    } else {
      repsRow = `
        <div class="sets-reps-edit-row">
          <span class="edit-label">Reps</span>
          <button class="edit-stepper-btn" data-field="reps" data-action="decrease">&minus;</button>
          <span class="edit-value" id="edit-reps-value">${effectiveExercise.reps}</span>
          <button class="edit-stepper-btn" data-field="reps" data-action="increase">+</button>
        </div>
      `;
    }

    return `
      <div class="sets-reps-edit-row">
        <span class="edit-label">Sets</span>
        <button class="edit-stepper-btn" data-field="sets" data-action="decrease">&minus;</button>
        <span class="edit-value" id="edit-sets-value">${setsValue}</span>
        <button class="edit-stepper-btn" data-field="sets" data-action="increase">+</button>
      </div>
      ${repsRow}
      <div class="sets-reps-edit-actions">
        <button class="edit-reset-btn" id="reset-sets-reps">Reset</button>
        <button class="edit-done-btn" id="done-sets-reps">Done</button>
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

    const makePlateHTML = (platesArr) => platesArr.map(plate => {
      const style = plate.border
        ? `background: ${plate.color}; border: 2px solid #333;`
        : `background: ${plate.color};`;
      return `<div class="plate" style="${style}">${plate.name}</div>`;
    }).join('');

    // Left side: reverse so heaviest is closest to bar (center)
    const leftPlates = [...plates].reverse();
    const leftHTML = makePlateHTML(leftPlates);
    // Right side: heaviest first (closest to bar) — already in order
    const rightHTML = makePlateHTML(plates);

    return `
      <div class="plate-bar">
        <div class="plates-left">${leftHTML}</div>
        <div class="barbell-bar">45</div>
        <div class="plates-right">${rightHTML}</div>
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

    // Color palette for each workout session
    const colors = [
      '#4285F4', '#EA4335', '#FBBC04', '#0F9D58',
      '#AB47BC', '#FF7043', '#26A69A', '#5C6BC0',
      '#EF5350', '#66BB6A', '#FFA726', '#42A5F5'
    ];

    const maxValue = Math.max(...recentHistory.flatMap(h =>
      h.sets?.map(s => s.reps || s.seconds || 0) || [0]
    ));

    // Y-axis labels (5 ticks)
    const yTicks = [];
    const step = Math.ceil(maxValue / 4);
    for (let i = 0; i <= 4; i++) {
      yTicks.push(i * step);
    }
    const yMax = yTicks[yTicks.length - 1] || 1;

    const groupsHTML = recentHistory.map((entry, i) => {
      const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const color = colors[i % colors.length];
      const sets = entry.sets || [];

      const barsHTML = sets.map(set => {
        const value = set.reps || set.seconds || 0;
        const heightPct = (value / yMax) * 100;
        return `<div class="vbar" style="height: ${heightPct}%; background: ${color};">
          <span class="vbar-label">${value}</span>
        </div>`;
      }).join('');

      return `
        <div class="vbar-group">
          <div class="vbar-bars">${barsHTML}</div>
          <div class="vbar-date">${date}</div>
        </div>
      `;
    }).join('');

    const yLabelsHTML = yTicks.reverse().map(v =>
      `<div class="vbar-y-label">${v}</div>`
    ).join('');

    return `
      <div class="vbar-chart-wrapper">
        <div class="vbar-y-axis">${yLabelsHTML}</div>
        <div class="vbar-chart-scroll">
          <div class="vbar-chart">
            ${groupsHTML}
          </div>
        </div>
      </div>
    `;
  },

  renderHistoryTab(exerciseId, exercise) {
    const phase = this.exerciseDetail?.phase || 1;
    const effective = this.getEffectiveExercise(exercise, phase);
    const history = Storage.getExerciseHistory(exerciseId);
    const isBodyweight = exercise.bodyweight;
    const isTimeBased = typeof effective.reps === 'string' && (effective.reps.includes('sec') || effective.reps.includes('min'));

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
        const target = `${effective.sets}×${effective.reps}`;
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
    const exerciseType = this.getExerciseType(exerciseId);
    const isSingleArm = exerciseType === 'single-arm';
    const isBarbell = exerciseType === 'barbell';

    document.querySelectorAll('.weight-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const increment = parseFloat(e.target.dataset.increment) || 5;
        let currentWeight = Storage.getExerciseWeight(exerciseId) || 135;
        const minWeight = isBarbell ? 45 : increment;

        if (action === 'increase') currentWeight += increment;
        if (action === 'decrease') currentWeight = Math.max(minWeight, currentWeight - increment);

        Storage.setExerciseWeight(exerciseId, currentWeight);
        const label = `${currentWeight} lb`;
        document.getElementById('weight-value').textContent = label;

        // Update plates (only for barbell exercises)
        const plateViz = document.querySelector('.plate-visualization');
        if (plateViz && isBarbell) {
          const plates = this.calculatePlates(currentWeight);
          plateViz.innerHTML = this.renderPlateBar(plates);
        }
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

    // Sets/Reps editor: tap to open
    const setsRepsTap = document.getElementById('sets-reps-tap-target');
    const setsRepsEditor = document.getElementById('sets-reps-editor');
    if (setsRepsTap && setsRepsEditor) {
      setsRepsTap.addEventListener('click', () => {
        setsRepsTap.style.display = 'none';
        setsRepsEditor.style.display = 'flex';
      });
    }

    // Sets/Reps editor: stepper buttons
    document.querySelectorAll('.edit-stepper-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const field = e.currentTarget.dataset.field;
        const action = e.currentTarget.dataset.action;
        const valueEl = document.getElementById(`edit-${field}-value`);
        if (!valueEl) return;

        const isTimeBased = valueEl.dataset.timeBased === 'true';
        let current = parseInt(valueEl.textContent);

        if (field === 'sets') {
          if (action === 'increase') current = Math.min(10, current + 1);
          if (action === 'decrease') current = Math.max(1, current - 1);
        } else {
          if (isTimeBased) {
            if (action === 'increase') current = Math.min(120, current + 5);
            if (action === 'decrease') current = Math.max(15, current - 5);
          } else {
            if (action === 'increase') current = Math.min(20, current + 1);
            if (action === 'decrease') current = Math.max(1, current - 1);
          }
        }

        valueEl.textContent = current;
      });
    });

    // Sets/Reps editor: Done button
    const doneBtn = document.getElementById('done-sets-reps');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        const phase = this.exerciseDetail?.phase || 1;
        const setsVal = parseInt(document.getElementById('edit-sets-value').textContent);
        const repsEl = document.getElementById('edit-reps-value');

        let repsVal;
        if (repsEl.dataset.isMax === 'true') {
          repsVal = 'max';
        } else if (repsEl.dataset.timeBased === 'true') {
          const suffix = repsEl.dataset.suffix || 'sec';
          repsVal = `${repsEl.textContent}${suffix}`;
        } else {
          repsVal = parseInt(repsEl.textContent);
        }

        Storage.setExerciseSetsReps(exerciseId, phase, setsVal, repsVal);

        // Re-render weight tab
        const content = document.querySelector('.exercise-detail-content');
        content.innerHTML = this.renderExerciseDetailTab('weight', exerciseId, exercise);
        this.setupWeightAdjustListeners();
      });
    }

    // Sets/Reps editor: Reset button
    const resetBtn = document.getElementById('reset-sets-reps');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const phase = this.exerciseDetail?.phase || 1;
        Storage.clearExerciseSetsReps(exerciseId, phase);

        // Re-render weight tab
        const content = document.querySelector('.exercise-detail-content');
        content.innerHTML = this.renderExerciseDetailTab('weight', exerciseId, exercise);
        this.setupWeightAdjustListeners();
      });
    }
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
  },

  // ========== Library View ==========

  renderLibraryView() {
    const info = this.getProgramInfo(this.currentDate);
    const currentPhase = (info.status === 'active') ? info.phase : 1;
    const grouped = getExercisesByCategory();

    // Determine today's lift type (if any) for highlighting
    const todayWorkout = this.getScheduledWorkout(this.currentDate);
    const todayLiftType = todayWorkout && todayWorkout.type.includes('lift') ? todayWorkout.type : null;

    // Build lookup: exerciseId → set of lift types it appears in (across current phase)
    const phaseKey = `phase${currentPhase}`;
    const liftTypes = ['lift-a', 'lift-b', 'lift-c'];
    const liftLabels = { 'lift-a': 'A', 'lift-b': 'B', 'lift-c': 'C' };
    const exerciseLiftDays = {};
    for (const lt of liftTypes) {
      const phaseData = WORKOUT_DETAILS[lt]?.[phaseKey];
      if (!phaseData?.exercises) continue;
      for (const ex of phaseData.exercises) {
        if (!exerciseLiftDays[ex.id]) exerciseLiftDays[ex.id] = [];
        if (!exerciseLiftDays[ex.id].includes(lt)) exerciseLiftDays[ex.id].push(lt);
      }
    }

    let html = `
      <div class="library-view">
        <div class="library-header">
          <h1>Exercise Library</h1>
          <div class="library-phase-badge">Phase ${currentPhase}</div>
        </div>`;

    for (const [category, exercises] of Object.entries(grouped)) {
      html += `
        <div class="library-category">
          <h2 class="library-category-title">${category}</h2>
          <div class="library-cards">`;

      for (const ex of exercises) {
        const effective = this.getEffectiveExercise(ex, currentPhase);
        const weight = Storage.getExerciseWeight(ex.id);
        const history = Storage.getExerciseHistory(ex.id);
        const sessionCount = history.length;

        // Format sets x reps
        let setsReps = '';
        if (effective.sets && effective.reps) {
          setsReps = `${effective.sets}×${effective.reps}`;
        }

        // Format weight display
        let weightDisplay = '';
        if (weight && !ex.bodyweight) {
          weightDisplay = `${weight} lbs`;
        } else if (ex.bodyweight) {
          weightDisplay = 'Bodyweight';
        }

        // Lift day badges (A/B/C) — highlight today's lift day
        const days = exerciseLiftDays[ex.id] || [];
        const dayBadges = days.map(lt =>
          `<span class="library-phase-pip${lt === todayLiftType ? ' current' : ''}">${liftLabels[lt]}</span>`
        ).join('');

        // Check if this exercise exists in the current phase
        const inCurrentPhase = days.length > 0;

        html += `
          <div class="library-card${inCurrentPhase ? '' : ' library-card-inactive'}" data-exercise-id="${ex.id}">
            <div class="library-card-main">
              <div class="library-card-name">${ex.name}</div>
              <div class="library-card-meta">
                ${setsReps ? `<span class="library-card-setsreps">${setsReps}</span>` : ''}
                ${weightDisplay ? `<span class="library-card-weight">${weightDisplay}</span>` : ''}
              </div>
            </div>
            <div class="library-card-footer">
              <div class="library-card-phases">${dayBadges}</div>
              ${sessionCount > 0 ? `<div class="library-card-sessions">${sessionCount} session${sessionCount !== 1 ? 's' : ''}</div>` : ''}
            </div>
          </div>`;
      }

      html += `
          </div>
        </div>`;
    }

    html += '</div>';
    return html;
  },

  setupLibraryListeners() {
    const info = this.getProgramInfo(this.currentDate);
    const currentPhase = (info.status === 'active') ? info.phase : 1;
    const phaseKey = `phase${currentPhase}`;

    document.querySelectorAll('.library-card').forEach(card => {
      card.addEventListener('click', () => {
        const exerciseId = card.dataset.exerciseId;

        // Find the exercise object from workout details
        const liftTypes = ['lift-a', 'lift-b', 'lift-c'];
        let foundExercise = null;

        // First try current phase, then any phase
        for (const lt of liftTypes) {
          const phaseData = WORKOUT_DETAILS[lt]?.[phaseKey];
          if (phaseData?.exercises) {
            const match = phaseData.exercises.find(e => e.id === exerciseId);
            if (match) {
              foundExercise = match;
              break;
            }
          }
        }

        // Fallback: search all phases
        if (!foundExercise) {
          for (const lt of liftTypes) {
            const ltd = WORKOUT_DETAILS[lt];
            if (!ltd) continue;
            for (const pk of Object.keys(ltd)) {
              const match = ltd[pk].exercises?.find(e => e.id === exerciseId);
              if (match) {
                foundExercise = match;
                break;
              }
            }
            if (foundExercise) break;
          }
        }

        if (foundExercise) {
          this.openExerciseDetail(exerciseId, foundExercise.name, foundExercise, currentPhase);
        }
      });
    });
  },

  // ========== Running Stats View ==========

  formatPace(minsPerMile) {
    if (!minsPerMile || minsPerMile <= 0) return '--:--';
    const mins = Math.floor(minsPerMile);
    const secs = Math.round((minsPerMile - mins) * 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  },

  formatDuration(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0) return '0:00';
    const hrs = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  },

  renderRunningView() {
    const startDate = Storage.getStartDate();
    const info = this.getProgramInfo(this.currentDate);
    const runs = Storage.getAllRunData();
    const weeklySummaries = Storage.getWeeklyRunSummaries(startDate);

    // Program totals
    const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);
    const totalRuns = runs.length;
    const avgPace = totalDistance > 0 ? totalDuration / totalDistance : 0;
    const runsWithHR = runs.filter(r => r.avgHR > 0);
    const avgHR = runsWithHR.length > 0
      ? Math.round(runsWithHR.reduce((sum, r) => sum + r.avgHR, 0) / runsWithHR.length)
      : 0;

    // This week stats
    const currentWeek = (info.status === 'active') ? info.week : null;
    const thisWeekSummary = currentWeek ? weeklySummaries.find(w => w.week === currentWeek) : null;
    const weekTarget = currentWeek && MILEAGE_TARGETS[currentWeek] ? MILEAGE_TARGETS[currentWeek].total : 0;
    const weekDistance = thisWeekSummary ? thisWeekSummary.totalDistance : 0;
    const weekProgress = weekTarget > 0 ? Math.min(weekDistance / weekTarget * 100, 100) : 0;

    let html = `<div class="running-view">`;

    // Header
    html += `
      <div class="running-header">
        <h1>Running Stats</h1>
        ${currentWeek ? `<div class="running-week-badge">Week ${currentWeek}</div>` : ''}
      </div>`;

    // Empty state
    if (runs.length === 0) {
      html += `
        <div class="running-empty">
          <p>No runs logged yet.</p>
          <p>Complete a run workout and your stats will appear here.</p>
        </div>
      </div>`;
      return html;
    }

    // This Week card
    if (currentWeek) {
      html += `
        <div class="running-card">
          <h3 class="running-card-title">This Week</h3>
          <div class="running-this-week">
            <div class="running-progress-row">
              <span class="running-progress-label">${weekDistance.toFixed(1)} / ${weekTarget} mi</span>
              <span class="running-progress-pct">${Math.round(weekProgress)}%</span>
            </div>
            <div class="running-progress-bar">
              <div class="running-progress-fill" style="width: ${weekProgress}%"></div>
            </div>
            <div class="running-week-stats">
              <div class="running-stat-mini">
                <span class="running-stat-mini-value">${thisWeekSummary ? thisWeekSummary.runCount : 0}</span>
                <span class="running-stat-mini-label">Runs</span>
              </div>
              <div class="running-stat-mini">
                <span class="running-stat-mini-value">${thisWeekSummary ? this.formatPace(thisWeekSummary.avgPace) : '--:--'}</span>
                <span class="running-stat-mini-label">Avg Pace</span>
              </div>
              <div class="running-stat-mini">
                <span class="running-stat-mini-value">${thisWeekSummary && thisWeekSummary.avgHR > 0 ? thisWeekSummary.avgHR : '--'}</span>
                <span class="running-stat-mini-label">Avg HR</span>
              </div>
            </div>
          </div>
        </div>`;
    }

    // Program Totals card
    html += `
      <div class="running-card">
        <h3 class="running-card-title">Program Totals</h3>
        <div class="running-totals-grid">
          <div class="running-total">
            <span class="running-total-value">${totalDistance.toFixed(1)}</span>
            <span class="running-total-label">Miles</span>
          </div>
          <div class="running-total">
            <span class="running-total-value">${totalRuns}</span>
            <span class="running-total-label">Runs</span>
          </div>
          <div class="running-total">
            <span class="running-total-value">${this.formatDuration(totalDuration)}</span>
            <span class="running-total-label">Time</span>
          </div>
          <div class="running-total">
            <span class="running-total-value">${this.formatPace(avgPace)}</span>
            <span class="running-total-label">Avg Pace</span>
          </div>
        </div>
      </div>`;

    // Weekly Mileage chart
    if (weeklySummaries.length > 0) {
      html += this.renderWeeklyMileageChart(weeklySummaries);
    }

    // Pace Trend chart
    const runsWithPace = runs.filter(r => r.pace > 0);
    if (runsWithPace.length >= 2) {
      html += this.renderPaceTrendChart(runsWithPace);
    }

    // Cardiac Efficiency chart
    const runsWithEfficiency = runs.filter(r => r.efficiency > 0);
    if (runsWithEfficiency.length >= 2) {
      html += this.renderEfficiencyChart(runsWithEfficiency);
    }

    // Recent Runs
    html += this.renderRecentRunsList(runs);

    html += '</div>';
    return html;
  },

  renderWeeklyMileageChart(weeklySummaries) {
    // Determine range: show all weeks that have targets or data
    const allWeeks = [];
    const dataWeeks = new Set(weeklySummaries.map(w => w.week));

    // Include weeks 5-21 (when mileage targets exist) and any earlier weeks with data
    const minWeek = Math.min(5, ...weeklySummaries.map(w => w.week));
    const maxWeek = Math.max(21, ...weeklySummaries.map(w => w.week));

    for (let w = minWeek; w <= maxWeek; w++) {
      const summary = weeklySummaries.find(s => s.week === w);
      const target = MILEAGE_TARGETS[w]?.total || 0;
      if (summary || target > 0) {
        allWeeks.push({
          week: w,
          actual: summary ? summary.totalDistance : 0,
          target: target,
          isDeload: MILEAGE_TARGETS[w]?.isDeload || false
        });
      }
    }

    if (allWeeks.length === 0) return '';

    const maxValue = Math.max(...allWeeks.map(w => Math.max(w.actual, w.target)), 1);
    const barHeight = 120;

    let bars = '';
    for (const w of allWeeks) {
      const actualHeight = (w.actual / maxValue) * barHeight;
      const targetHeight = (w.target / maxValue) * barHeight;

      bars += `
        <div class="mileage-bar-group">
          <div class="mileage-bar-container" style="height: ${barHeight}px">
            ${w.target > 0 ? `<div class="mileage-bar-target" style="height: ${targetHeight}px" title="Target: ${w.target} mi"></div>` : ''}
            <div class="mileage-bar-actual${w.isDeload ? ' deload' : ''}" style="height: ${actualHeight}px"></div>
          </div>
          <span class="mileage-bar-label">W${w.week}</span>
        </div>`;
    }

    return `
      <div class="running-card">
        <h3 class="running-card-title">Weekly Mileage</h3>
        <div class="mileage-chart-scroll">
          <div class="mileage-chart">
            ${bars}
          </div>
        </div>
        <div class="mileage-legend">
          <span class="mileage-legend-item"><span class="mileage-legend-dot actual"></span>Actual</span>
          <span class="mileage-legend-item"><span class="mileage-legend-dot target"></span>Target</span>
        </div>
      </div>`;
  },

  renderPaceTrendChart(runs) {
    return this.renderTrendChart(runs, 'pace', 'Pace Trend', 'min/mi', true);
  },

  renderEfficiencyChart(runs) {
    return this.renderTrendChart(runs, 'efficiency', 'Cardiac Efficiency', 'speed/HR', false);
  },

  renderTrendChart(runs, field, title, unit, invertY) {
    // SVG line chart
    const width = Math.max(300, runs.length * 40);
    const height = 140;
    const padX = 40;
    const padY = 20;
    const plotW = width - padX - 10;
    const plotH = height - padY * 2;

    const values = runs.map(r => r[field]);
    const minVal = Math.min(...values) * 0.9;
    const maxVal = Math.max(...values) * 1.1;
    const range = maxVal - minVal || 1;

    const points = runs.map((r, i) => {
      const x = padX + (i / (runs.length - 1)) * plotW;
      const normalized = (r[field] - minVal) / range;
      const y = invertY
        ? padY + normalized * plotH   // Lower pace = better = top
        : padY + (1 - normalized) * plotH;  // Higher efficiency = better = top
      return { x, y, value: r[field], date: r.date };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Y-axis labels
    const topVal = invertY ? minVal : maxVal;
    const bottomVal = invertY ? maxVal : minVal;
    const topLabel = field === 'pace' ? this.formatPace(topVal) : topVal.toFixed(1);
    const bottomLabel = field === 'pace' ? this.formatPace(bottomVal) : bottomVal.toFixed(1);

    // Dots
    const dots = points.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--color-primary)" />`
    ).join('');

    // Date labels (show first and last)
    const firstDate = runs[0].date.slice(5); // MM-DD
    const lastDate = runs[runs.length - 1].date.slice(5);

    return `
      <div class="running-card">
        <h3 class="running-card-title">${title}</h3>
        <div class="trend-chart-scroll">
          <svg class="trend-chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <text x="${padX - 4}" y="${padY + 4}" text-anchor="end" class="chart-label">${topLabel}</text>
            <text x="${padX - 4}" y="${padY + plotH + 4}" text-anchor="end" class="chart-label">${bottomLabel}</text>
            <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${padY + plotH}" stroke="var(--color-border)" stroke-width="1" />
            <line x1="${padX}" y1="${padY + plotH}" x2="${padX + plotW}" y2="${padY + plotH}" stroke="var(--color-border)" stroke-width="1" />
            <path d="${pathData}" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            ${dots}
            <text x="${padX}" y="${height - 2}" class="chart-label">${firstDate}</text>
            <text x="${padX + plotW}" y="${height - 2}" text-anchor="end" class="chart-label">${lastDate}</text>
          </svg>
        </div>
      </div>`;
  },

  renderRecentRunsList(runs) {
    const recent = runs.slice(-10).reverse();

    let rows = '';
    for (const run of recent) {
      const dateObj = this.parseDate(run.date);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
      const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

      rows += `
        <div class="recent-run-row">
          <div class="recent-run-date">
            <span class="recent-run-day">${dayName}</span>
            <span class="recent-run-monthday">${monthDay}</span>
          </div>
          <div class="recent-run-distance">${run.distance > 0 ? run.distance.toFixed(1) + ' mi' : '--'}</div>
          <div class="recent-run-pace">${this.formatPace(run.pace)}</div>
          <div class="recent-run-hr">${run.avgHR > 0 ? run.avgHR + '' : '--'}</div>
        </div>`;
    }

    return `
      <div class="running-card">
        <h3 class="running-card-title">Recent Runs</h3>
        <div class="recent-runs-header">
          <span>Date</span>
          <span>Distance</span>
          <span>Pace</span>
          <span>HR</span>
        </div>
        ${rows}
      </div>`;
  },

  setupRunningListeners() {
    // No interactive elements yet — charts are display-only
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    App.init();
  } catch (err) {
    console.error('[App] Init failed:', err);
    const content = document.getElementById('main-content');
    if (content) {
      const stack = (err.stack || '').replace(/</g, '&lt;').substring(0, 500);
      content.innerHTML = '<div style="padding: 20px; color: red;">' +
        '<p><strong>Init error:</strong> ' + err.message + '</p>' +
        '<pre style="font-size:11px;overflow-x:auto;white-space:pre-wrap;color:#333;margin:12px 0;">' + stack + '</pre>' +
        '<button onclick="clearAndReload()" style="padding:12px 24px;background:#4285F4;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:12px;">Clear Cache & Reload</button>' +
        '</div>';
    }
  }
});
