// LocalStorage helpers for CIM Training App

const STORAGE_KEYS = {
  USER_DATA: 'cim_user_data',
  START_DATE: 'cim_start_date',
  APP_VERSION: 'cim_app_version'
};

const CURRENT_VERSION = '1.1'; // Increment this when making breaking changes
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
  }
};
