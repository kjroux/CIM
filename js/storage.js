// LocalStorage helpers for CIM Training App

const STORAGE_KEYS = {
  USER_DATA: 'cim_user_data',
  START_DATE: 'cim_start_date',
  APP_VERSION: 'cim_app_version'
};

const CURRENT_VERSION = '1.3'; // Increment this when making breaking changes
const DEFAULT_START_DATE = '2026-02-02'; // Monday of week 1 (Feb 2, 2026)

const Storage = {

  // Initialize default user data structure
  initUserData() {
    let existingData = this.getUserData();
    const storedVersion = localStorage.getItem(STORAGE_KEYS.APP_VERSION);

    // Check if we need to migrate data
    if (existingData && storedVersion !== CURRENT_VERSION) {
      existingData = this.migrateData(existingData, storedVersion);
      this.saveUserData(existingData);
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
    }

    if (!existingData) {
      const defaultData = {
        startDate: DEFAULT_START_DATE,
        logs: {},
        dailyRoutines: {},
        weekReorderings: {},
        exerciseSetsReps: {},
        version: CURRENT_VERSION
      };
      this.saveUserData(defaultData);
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
      return defaultData;
    }
    return existingData;
  },

  // Migrate old data to new format
  migrateData(data, oldVersion) {
    console.log('Migrating data from version', oldVersion, 'to', CURRENT_VERSION);

    // If start date is from 2025, update to 2026
    if (data.startDate && data.startDate.startsWith('2025')) {
      console.log('Updating start date from 2025 to 2026');
      // Only update if user hasn't logged any workouts yet
      if (!data.logs || Object.keys(data.logs).length === 0) {
        data.startDate = DEFAULT_START_DATE;
      } else {
        console.log('User has existing logs, keeping old start date');
      }
    }

    // v1.2: Migrate to single weight per exercise structure
    if (data.logs) {
      Object.keys(data.logs).forEach(date => {
        const log = data.logs[date];
        if (log.exercises) {
          Object.keys(log.exercises).forEach(exerciseId => {
            const exercise = log.exercises[exerciseId];
            // If sets array has weight in each set, migrate to single weight
            if (exercise.sets && exercise.sets.length > 0 && exercise.sets[0].weight !== undefined) {
              // Take first set's weight as the exercise weight
              exercise.weight = exercise.sets[0].weight;
              // Remove weight from individual sets, add completed flag
              exercise.sets = exercise.sets.map(set => ({
                reps: set.reps || set.seconds,
                completed: set.reps > 0 || set.seconds > 0,
                ...(set.seconds !== undefined && { seconds: set.seconds })
              }));
            }
          });
        }
      });
    }

    // Initialize exercise weights storage if not exists
    if (!data.exerciseWeights) {
      data.exerciseWeights = {};
    }

    // Initialize week reorderings storage if not exists
    if (!data.weekReorderings) {
      data.weekReorderings = {};
    }

    // Initialize exercise sets/reps overrides if not exists
    if (!data.exerciseSetsReps) {
      data.exerciseSetsReps = {};
    }

    data.version = CURRENT_VERSION;
    return data;
  },

  // Get all user data
  getUserData() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading user data:', e);
      return null;
    }
  },

  // Save all user data
  saveUserData(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error saving user data:', e);
      return false;
    }
  },

  // Get start date
  getStartDate() {
    const userData = this.getUserData();
    return userData ? userData.startDate : DEFAULT_START_DATE;
  },

  // Set start date
  setStartDate(dateString) {
    const userData = this.getUserData() || { logs: {}, dailyRoutines: {} };
    userData.startDate = dateString;
    return this.saveUserData(userData);
  },

  // Get log for specific date
  getLog(dateString) {
    const userData = this.getUserData();
    return userData && userData.logs ? userData.logs[dateString] : null;
  },

  // Save log for specific date
  saveLog(dateString, logData) {
    const userData = this.getUserData() || { startDate: DEFAULT_START_DATE, logs: {}, dailyRoutines: {} };
    if (!userData.logs) userData.logs = {};
    userData.logs[dateString] = logData;
    return this.saveUserData(userData);
  },

  // Get daily routines for specific date
  getDailyRoutines(dateString) {
    const userData = this.getUserData();
    return userData && userData.dailyRoutines ? userData.dailyRoutines[dateString] : null;
  },

  // Save daily routines for specific date
  saveDailyRoutines(dateString, routinesData) {
    const userData = this.getUserData() || { startDate: DEFAULT_START_DATE, logs: {}, dailyRoutines: {} };
    if (!userData.dailyRoutines) userData.dailyRoutines = {};
    userData.dailyRoutines[dateString] = routinesData;
    return this.saveUserData(userData);
  },

  // Get all logs
  getAllLogs() {
    const userData = this.getUserData();
    return userData && userData.logs ? userData.logs : {};
  },

  // Clear all data
  clearAllData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      return true;
    } catch (e) {
      console.error('Error clearing data:', e);
      return false;
    }
  },

  // Reset to default
  resetToDefault() {
    this.clearAllData();
    return this.initUserData();
  },

  // Get last used weight for an exercise
  getExerciseWeight(exerciseId) {
    const userData = this.getUserData();
    if (!userData || !userData.exerciseWeights) return null;
    return userData.exerciseWeights[exerciseId] || null;
  },

  // Set weight for an exercise (global last used)
  setExerciseWeight(exerciseId, weight) {
    const userData = this.getUserData() || { startDate: DEFAULT_START_DATE, logs: {}, dailyRoutines: {}, exerciseWeights: {} };
    if (!userData.exerciseWeights) userData.exerciseWeights = {};
    userData.exerciseWeights[exerciseId] = weight;
    return this.saveUserData(userData);
  },

  // Get exercise history across all dates
  getExerciseHistory(exerciseId) {
    const userData = this.getUserData();
    if (!userData || !userData.logs) return [];

    const history = [];
    Object.keys(userData.logs).sort().forEach(date => {
      const log = userData.logs[date];
      if (log.exercises && log.exercises[exerciseId]) {
        history.push({
          date,
          ...log.exercises[exerciseId]
        });
      }
    });
    return history;
  },

  // Get week reordering for a specific week (permutation array)
  getWeekReordering(weekStartDate) {
    const userData = this.getUserData();
    if (!userData || !userData.weekReorderings) return null;
    return userData.weekReorderings[weekStartDate] || null;
  },

  // Save week reordering (permutation array of indices 0-6)
  saveWeekReordering(weekStartDate, permutation) {
    const userData = this.getUserData() || {
      startDate: DEFAULT_START_DATE,
      logs: {},
      dailyRoutines: {},
      exerciseWeights: {},
      weekReorderings: {}
    };

    if (!userData.weekReorderings) {
      userData.weekReorderings = {};
    }

    // Validate: must be array of 7 integers
    if (!Array.isArray(permutation) || permutation.length !== 7) {
      console.error('Invalid week reordering: must be array of 7 indices');
      return false;
    }

    // Validate: must be permutation of [0,1,2,3,4,5,6]
    const sorted = [...permutation].sort((a, b) => a - b);
    const isValidPermutation = sorted.every((val, idx) => val === idx);
    if (!isValidPermutation) {
      console.error('Invalid week reordering: must be permutation of [0,1,2,3,4,5,6]');
      return false;
    }

    userData.weekReorderings[weekStartDate] = permutation;
    return this.saveUserData(userData);
  },

  // Reset week to original order (delete reordering)
  resetWeekReordering(weekStartDate) {
    const userData = this.getUserData();
    if (!userData || !userData.weekReorderings) return true;

    delete userData.weekReorderings[weekStartDate];
    return this.saveUserData(userData);
  },

  // Get custom sets/reps override for an exercise in a specific phase
  getExerciseSetsReps(exerciseId, phase) {
    const userData = this.getUserData();
    if (!userData || !userData.exerciseSetsReps) return null;
    const key = `${exerciseId}:phase${phase}`;
    return userData.exerciseSetsReps[key] || null;
  },

  // Set custom sets/reps for an exercise in a specific phase
  setExerciseSetsReps(exerciseId, phase, sets, reps) {
    const userData = this.getUserData() || {
      startDate: DEFAULT_START_DATE,
      logs: {},
      dailyRoutines: {},
      exerciseWeights: {},
      weekReorderings: {},
      exerciseSetsReps: {}
    };
    if (!userData.exerciseSetsReps) userData.exerciseSetsReps = {};
    const key = `${exerciseId}:phase${phase}`;
    userData.exerciseSetsReps[key] = { sets, reps };
    return this.saveUserData(userData);
  },

  // Clear custom sets/reps override (reset to program default)
  clearExerciseSetsReps(exerciseId, phase) {
    const userData = this.getUserData();
    if (!userData || !userData.exerciseSetsReps) return true;
    const key = `${exerciseId}:phase${phase}`;
    delete userData.exerciseSetsReps[key];
    return this.saveUserData(userData);
  }
};
