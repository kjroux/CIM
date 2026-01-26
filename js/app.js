// CIM Training App - Main Application Logic

const App = {
  currentView: 'today',
  currentDate: null,
  currentWeek: 1,

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
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed:', err));
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
      const loggedSets = log?.exercises?.[ex.id]?.sets || [];
      const repsDisplay = typeof ex.reps === 'number' ? `${ex.reps} reps` : ex.reps;

      return `
        <div class="exercise-item" data-exercise-id="${ex.id}">
          <div class="exercise-header">
            <h4>${ex.name}</h4>
            <span class="exercise-target">${ex.sets}x${repsDisplay}</span>
          </div>
          ${ex.notes ? `<p class="exercise-notes">${ex.notes}</p>` : ''}
          <div class="exercise-sets">
            ${this.renderExerciseSets(ex, loggedSets)}
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

  renderExerciseSets(exercise, loggedSets) {
    let sets = [];
    for (let i = 0; i < exercise.sets; i++) {
      const logged = loggedSets[i] || { weight: '', reps: '' };
      sets.push(`
        <div class="set-row">
          <span class="set-number">Set ${i + 1}:</span>
          <input type="number" class="set-input" placeholder="Weight" value="${logged.weight}" data-set="${i}" data-field="weight">
          <span>lbs x</span>
          <input type="number" class="set-input" placeholder="Reps" value="${logged.reps}" data-set="${i}" data-field="reps">
        </div>
      `);
    }
    return sets.join('');
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

    // Exercise inputs - save on change
    document.querySelectorAll('.set-input').forEach(input => {
      input.addEventListener('change', () => this.saveExerciseData());
    });

    // Auto-populate weight from set 1 to other sets
    document.querySelectorAll('.exercise-item').forEach(exerciseItem => {
      const weightInputs = exerciseItem.querySelectorAll('.set-input[data-field="weight"]');
      if (weightInputs.length > 0) {
        const firstWeightInput = weightInputs[0];
        firstWeightInput.addEventListener('blur', (e) => {
          const weight = e.target.value;
          // Only auto-populate if subsequent sets are empty
          for (let i = 1; i < weightInputs.length; i++) {
            if (!weightInputs[i].value || weightInputs[i].value === '') {
              weightInputs[i].value = weight;
            }
          }
        });
      }
    });

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
  },

  navigateDay(delta) {
    this.currentDate = this.addDays(this.currentDate, delta);
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

      item.querySelectorAll('.set-row').forEach(row => {
        const setNum = row.querySelector('[data-field="weight"]').dataset.set;
        const weight = row.querySelector('[data-field="weight"]').value;
        const reps = row.querySelector('[data-field="reps"]').value;
        sets.push({ weight, reps });
      });

      log.exercises[exerciseId] = { sets };
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

    // Save any current form data
    this.saveExerciseData();
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
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
