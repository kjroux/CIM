// LocalStorage helpers for CIM Training App

const STORAGE_KEYS = {
  USER_DATA: 'cim_user_data',
  START_DATE: 'cim_start_date',
  APP_VERSION: 'cim_app_version'
};

const CURRENT_VERSION = '1.3'; // Increment this when making breaking changes
const DEFAULT_START_DATE = '2026-02-02'; // Monday of week 1 (Feb 2, 2026)

const Storage = {

  // In-memory cache — all sync reads go through this
  _cache: null,

  // Async initialization: load from IDB (preferred) or localStorage (fallback)
  async initStorage() {
    // Initialize IndexedDB
    const idbReady = await IDBStorage.init();

    if (idbReady) {
      // Try loading from IDB first
      const idbData = await IDBStorage.getData();
      if (idbData) {
        console.log('[Storage] Loaded data from IndexedDB');
        this._cache = idbData;
        // Sync localStorage as backup
        this._saveToLocalStorage(idbData);
      } else {
        // IDB empty — try localStorage (first run after migration, or fresh)
        const lsData = this._loadFromLocalStorage();
        if (lsData) {
          console.log('[Storage] Migrating data from localStorage to IndexedDB');
          this._cache = lsData;
          // Seed IDB with localStorage data
          IDBStorage.saveData(lsData);
        }
      }
    } else {
      // IDB unavailable — fall back to localStorage only
      console.log('[Storage] IndexedDB unavailable, using localStorage only');
      this._cache = this._loadFromLocalStorage();
    }

    // Now run the normal init/migration logic
    return this.initUserData();
  },

  // Read raw data from localStorage
  _loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[Storage] Error reading localStorage:', e);
      return null;
    }
  },

  // Write to localStorage only (sync)
  _saveToLocalStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
    } catch (e) {
      console.error('[Storage] Error writing localStorage:', e);
    }
  },

  // Persist to both localStorage and IDB (IDB is fire-and-forget)
  _persist(data) {
    this._saveToLocalStorage(data);
    if (IDBStorage.isSupported()) {
      IDBStorage.saveData(data).catch(e => {
        console.warn('[Storage] IDB persist failed:', e);
      });
    }
  },

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
        exerciseWeights: {},
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

  // Get all user data (from cache, or fallback to localStorage)
  getUserData() {
    if (this._cache) return this._cache;
    // Fallback: cache not yet populated (called before initStorage)
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading user data:', e);
      return null;
    }
  },

  // Save all user data (cache + dual persist)
  saveUserData(data) {
    this._cache = data;
    try {
      this._persist(data);
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
    this._cache = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      if (IDBStorage.isSupported()) {
        IDBStorage.deleteData().catch(e => {
          console.warn('[Storage] IDB clear failed:', e);
        });
      }
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
  },

  // Export all data as JSON string with metadata envelope
  exportAllData() {
    const userData = this.getUserData();
    if (!userData) return null;
    const envelope = {
      appName: 'CIM Marathon Training',
      appVersion: CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      data: userData
    };
    this.setLastExportDate(envelope.exportDate);
    return JSON.stringify(envelope, null, 2);
  },

  // Import data from JSON string, returns { success, message }
  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);

      // Accept either envelope format or raw userData
      let userData;
      if (parsed.data && parsed.appName === 'CIM Marathon Training') {
        userData = parsed.data;
      } else if (parsed.startDate && parsed.logs !== undefined) {
        userData = parsed;
      } else {
        return { success: false, message: 'Unrecognized file format. Expected a CIM Training backup.' };
      }

      // Validate required fields
      if (!userData.startDate || typeof userData.logs !== 'object') {
        return { success: false, message: 'Backup file is missing required data (startDate or logs).' };
      }

      // Run through migration to ensure compatibility
      const storedVersion = userData.version || '1.0';
      if (storedVersion !== CURRENT_VERSION) {
        userData = this.migrateData(userData, storedVersion);
      }

      this.saveUserData(userData);
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
      return { success: true, message: 'Data restored successfully.' };
    } catch (e) {
      console.error('Import error:', e);
      return { success: false, message: 'Failed to read backup file. The file may be corrupted.' };
    }
  },

  // Parse duration string (mm:ss or raw minutes) to total minutes
  parseDurationToMinutes(val) {
    if (!val) return 0;
    if (typeof val === 'string' && val.includes(':')) {
      const parts = val.split(':');
      return (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
    }
    return parseFloat(val) || 0;
  },

  // Get all run data from logs, sorted by date
  getAllRunData() {
    const userData = this.getUserData();
    if (!userData || !userData.logs) return [];

    const runs = [];
    Object.keys(userData.logs).sort().forEach(date => {
      const log = userData.logs[date];
      if (log.run && (log.run.distance || log.run.duration)) {
        const distance = parseFloat(log.run.distance) || 0;
        const duration = this.parseDurationToMinutes(log.run.duration);
        const avgHR = parseFloat(log.run.avgHR) || 0;
        const pace = distance > 0 && duration > 0 ? duration / distance : 0;
        const efficiency = avgHR > 0 && duration > 0 && distance > 0
          ? (distance / duration) * 60 / avgHR * 100 // speed(mph) / HR * 100
          : 0;

        runs.push({
          date,
          distance,
          duration,
          avgHR,
          pace,
          efficiency,
          workoutType: log.scheduled?.type || '',
          workoutName: log.scheduled?.name || 'Run',
          completed: log.completed || false
        });
      }
    });
    return runs;
  },

  // Get weekly run summaries grouped by program week
  getWeeklyRunSummaries(startDate) {
    const runs = this.getAllRunData();
    if (runs.length === 0) return [];

    const weekMap = {};
    const start = new Date(startDate + 'T00:00:00');

    for (const run of runs) {
      const runDate = new Date(run.date + 'T00:00:00');
      const daysDiff = Math.floor((runDate - start) / (1000 * 60 * 60 * 24));
      if (daysDiff < 0) continue;
      const weekNum = Math.floor(daysDiff / 7) + 1;

      if (!weekMap[weekNum]) {
        weekMap[weekNum] = {
          week: weekNum,
          totalDistance: 0,
          totalDuration: 0,
          totalHR: 0,
          hrCount: 0,
          runCount: 0,
          target: MILEAGE_TARGETS[weekNum]?.total || 0,
          isDeload: MILEAGE_TARGETS[weekNum]?.isDeload || false
        };
      }

      const w = weekMap[weekNum];
      w.totalDistance += run.distance;
      w.totalDuration += run.duration;
      if (run.avgHR > 0) {
        w.totalHR += run.avgHR;
        w.hrCount++;
      }
      w.runCount++;
    }

    // Calculate averages
    const weeks = Object.values(weekMap).sort((a, b) => a.week - b.week);
    for (const w of weeks) {
      w.avgPace = w.totalDistance > 0 ? w.totalDuration / w.totalDistance : 0;
      w.avgHR = w.hrCount > 0 ? Math.round(w.totalHR / w.hrCount) : 0;
    }

    return weeks;
  },

  // Get/set last export timestamp
  getLastExportDate() {
    return localStorage.getItem('cim_last_export') || null;
  },

  setLastExportDate(isoString) {
    localStorage.setItem('cim_last_export', isoString);
  }
};
