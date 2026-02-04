// CIM Marathon Training Program Data

const PROGRAM = {
  phases: [
    {
      id: 1,
      name: "Strength + Walk/Run",
      weeks: 4,
      weekTemplate: {
        1: { type: "lift-a", name: "Lift A: Push + Squat" },
        2: { type: "walk-run", name: "Walk/Run + Mobility" },
        3: { type: "lift-b", name: "Lift B: Pull + Hinge" },
        4: { type: "walk-run", name: "Walk/Run + Mobility" },
        5: { type: "lift-c", name: "Lift C: Legs + Glutes" },
        6: { type: "optional", name: "Optional: Walk/Run or Rest" },
        7: { type: "rest", name: "Rest" }
      }
    },
    {
      id: 2,
      name: "Transition to Running",
      weeks: 4,
      weekTemplate: {
        1: { type: "lift-a", name: "Lift A" },
        2: { type: "easy-run", name: "Easy Run" },
        3: { type: "lift-b", name: "Lift B" },
        4: { type: "easy-run", name: "Easy Run" },
        5: { type: "easy-run", name: "Easy Run" },
        6: { type: "long-run", name: "Long Run" },
        7: { type: "rest", name: "Rest" }
      }
    },
    {
      id: 3,
      name: "Base Building",
      weeks: 13,
      weekTemplate: {
        1: { type: "easy-run", name: "Easy Run" },
        2: { type: "lift-a", name: "Lift A" },
        3: { type: "easy-run-strides", name: "Easy Run + Strides" },
        4: { type: "lift-b", name: "Lift B" },
        5: { type: "easy-run", name: "Easy Run" },
        6: { type: "long-run", name: "Long Run" },
        7: { type: "rest", name: "Rest" }
      }
    }
  ]
};

const MILEAGE_TARGETS = {
  5: { mon: 0, tue: 3, wed: 0, thu: 3, fri: 2, sat: 4, sun: 0, total: 12 },
  6: { mon: 0, tue: 3, wed: 0, thu: 3, fri: 3, sat: 5, sun: 0, total: 14 },
  7: { mon: 0, tue: 4, wed: 0, thu: 3, fri: 3, sat: 5, sun: 0, total: 15 },
  8: { mon: 0, tue: 4, wed: 0, thu: 4, fri: 3, sat: 6, sun: 0, total: 17 },
  9:  { mon: 4, tue: 0, wed: 4, thu: 0, fri: 3, sat: 7,  sun: 0, total: 18 },
  10: { mon: 4, tue: 0, wed: 4, thu: 0, fri: 4, sat: 8,  sun: 0, total: 20 },
  11: { mon: 5, tue: 0, wed: 4, thu: 0, fri: 4, sat: 9,  sun: 0, total: 22 },
  12: { mon: 4, tue: 0, wed: 3, thu: 0, fri: 3, sat: 6,  sun: 0, total: 16, isDeload: true },
  13: { mon: 5, tue: 0, wed: 5, thu: 0, fri: 4, sat: 10, sun: 0, total: 24 },
  14: { mon: 5, tue: 0, wed: 5, thu: 0, fri: 4, sat: 11, sun: 0, total: 25 },
  15: { mon: 5, tue: 0, wed: 5, thu: 0, fri: 5, sat: 12, sun: 0, total: 27 },
  16: { mon: 4, tue: 0, wed: 4, thu: 0, fri: 3, sat: 8,  sun: 0, total: 19, isDeload: true },
  17: { mon: 5, tue: 0, wed: 6, thu: 0, fri: 5, sat: 13, sun: 0, total: 29 },
  18: { mon: 6, tue: 0, wed: 6, thu: 0, fri: 5, sat: 14, sun: 0, total: 31 },
  19: { mon: 6, tue: 0, wed: 6, thu: 0, fri: 5, sat: 15, sun: 0, total: 32 },
  20: { mon: 5, tue: 0, wed: 4, thu: 0, fri: 4, sat: 10, sun: 0, total: 23, isDeload: true },
  21: { mon: 5, tue: 0, wed: 5, thu: 0, fri: 4, sat: 16, sun: 0, total: 30, isTest: true }
};

const WORKOUT_DETAILS = {
  "lift-a": {
    phase1: {
      name: "Lift A: Push + Squat",
      duration: "60-70 min",
      exercises: [
        { id: "low-bar-squat", name: "Low-Bar Back Squat", sets: 3, reps: 5 },
        { id: "bench-press", name: "Bench Press", sets: 5, reps: 5 },
        { id: "hip-thrust", name: "Barbell Hip Thrust", sets: 3, reps: 10 },
        { id: "overhead-press", name: "Overhead Press", sets: 3, reps: 5 },
        { id: "farmer-carry", name: "Farmer Carries", sets: 3, reps: "45sec" },
        { id: "ring-dips", name: "Ring Dips", sets: 3, reps: 5, bodyweight: true }
      ]
    },
    phase2: {
      name: "Lift A: Upper + Squat + Glutes",
      duration: "60-70 min",
      exercises: [
        { id: "low-bar-squat", name: "Low-Bar Back Squat", sets: 3, reps: 5 },
        { id: "bench-press", name: "Bench Press", sets: 3, reps: 5 },
        { id: "barbell-row", name: "Barbell Row", sets: 3, reps: 5 },
        { id: "overhead-press", name: "OHP", sets: 3, reps: 5 },
        { id: "pullups", name: "Pull-ups", bodyweight: true, sets: 3, reps: "max" },
        { id: "hip-thrust", name: "Barbell Hip Thrust", sets: 3, reps: 10 },
        { id: "farmer-carry", name: "Farmer Carries", sets: 3, reps: "45sec" },
        { id: "cable-pullthrough", name: "Cable Pull-Through", sets: 2, reps: 12 }
      ]
    },
    phase3: {
      name: "Lift A: Upper + Squat + Glutes",
      duration: "50-60 min",
      exercises: [
        { id: "low-bar-squat", name: "Low-Bar Back Squat", sets: 3, reps: 5 },
        { id: "bench-press", name: "Bench Press", sets: 3, reps: 5 },
        { id: "barbell-row", name: "Barbell Row", sets: 3, reps: 5 },
        { id: "overhead-press", name: "OHP", sets: 2, reps: 5 },
        { id: "pullups", name: "Pull-ups", bodyweight: true, sets: 2, reps: "max" },
        { id: "hip-thrust", name: "Barbell Hip Thrust", sets: 3, reps: 8 },
        { id: "farmer-carry", name: "Farmer Carries", sets: 3, reps: "45sec" }
      ]
    }
  },
  "lift-b": {
    phase1: {
      name: "Lift B: Pull + Hinge + Eccentric Quad",
      duration: "60-70 min",
      exercises: [
        { id: "deadlift", name: "Deadlift", sets: 1, reps: 5 },
        { id: "barbell-row", name: "Barbell Row", sets: 3, reps: 5 },
        { id: "pullups", name: "Pull-ups", bodyweight: true, sets: 4, reps: 6 },
        { id: "step-downs", name: "Step-Downs", bodyweight: true, sets: 2, reps: 8 },
        { id: "monster-walks", name: "Monster Walks", bodyweight: true, sets: 2, reps: 12 },
        { id: "side-plank", name: "Side Plank", sets: 2, reps: "20sec", bodyweight: true }
      ]
    },
    phase2: {
      name: "Lift B: Lower + Eccentric Quad + Glutes",
      duration: "60-70 min",
      exercises: [
        { id: "deadlift", name: "Deadlift", sets: 1, reps: 5 },
        { id: "slow-tempo-front-squat", name: "Slow Tempo Front Squat", sets: 3, reps: 6, notes: "4 sec down, 1 sec up" },
        { id: "hip-thrust", name: "Barbell Hip Thrust", sets: 3, reps: 10 },
        { id: "bulgarian-split-squat", name: "Bulgarian Split Squats", sets: 3, reps: 8 },
        { id: "step-downs", name: "Step-Downs", bodyweight: true, sets: 2, reps: 8 },
        { id: "single-leg-calf", name: "Single-Leg Calf Raises", bodyweight: true, sets: 2, reps: 12 },
        { id: "monster-walks", name: "Monster Walks", bodyweight: true, sets: 2, reps: 12 }
      ]
    },
    phase3: {
      name: "Lift B: Lower + Eccentric Quad + Glutes",
      duration: "50-60 min",
      exercises: [
        { id: "deadlift", name: "Deadlift", sets: 1, reps: 5 },
        { id: "slow-tempo-squat", name: "Slow Tempo Squat", sets: 2, reps: 6, notes: "4 sec down, any variation" },
        { id: "hip-thrust", name: "Barbell Hip Thrust", sets: 3, reps: 8 },
        { id: "step-downs", name: "Step-Downs", bodyweight: true, sets: 2, reps: 8 },
        { id: "single-leg-calf", name: "Single-Leg Calf Raises", bodyweight: true, sets: 2, reps: 12 }
      ]
    }
  },
  "lift-c": {
    phase1: {
      name: "Lift C: Legs + Glutes",
      duration: "60-75 min",
      exercises: [
        { id: "back-squat-80", name: "Back Squat (80%)", sets: 3, reps: 8, noTracking: true },
        { id: "hip-thrust-80", name: "Hip Thrust (80%)", sets: 4, reps: 8, noTracking: true },
        { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", sets: 3, reps: 8 },
        { id: "walking-lunges", name: "Walking Lunges", bodyweight: true, sets: 3, reps: 10 },
        { id: "single-leg-calf", name: "Single-Leg Calf Raises", bodyweight: true, sets: 2, reps: 12 },
        { id: "core-circuit", name: "Core Circuit", sets: 1, reps: 1, bodyweight: true }
      ]
    }
  },
  "walk-run": {
    phase1: {
      name: "Walk/Run + Mobility",
      duration: "50-60 min",
      weeks: {
        1: { protocol: "Run 3min / Walk 2min x 5", totalTime: 25, runningTime: 15 },
        2: { protocol: "Run 4min / Walk 1min x 6", totalTime: 30, runningTime: 24 },
        3: { protocol: "Run 5min / Walk 1min x 5", totalTime: 30, runningTime: 25 },
        4: { protocol: "Run 6min / Walk 1min x 5", totalTime: 35, runningTime: 30 }
      },
      notes: "HR 139-145 bpm, 1% incline, 170-180 spm"
    }
  },
  "easy-run": {
    name: "Easy Run",
    notes: {
      default: "HR 139-145 bpm. Let HR dictate pace (probably 8:30-9:30/mile). 170-180 spm cadence.",
      phase3: "HR 145-151 bpm. Let HR dictate pace. 170-180 spm cadence."
    }
  },
  "easy-run-strides": {
    name: "Easy Run + Strides",
    notes: {
      default: "HR 139-145 bpm for run. Then 6-8 x 15sec strides at fast but controlled pace, 45-60sec recovery between.",
      phase3: "HR 145-151 bpm for run. Then 6-8 x 15sec strides at fast but controlled pace, 45-60sec recovery between."
    }
  },
  "long-run": {
    name: "Long Run",
    notes: {
      default: "HR 139-145 bpm. Same pace guidelines as easy run.",
      phase3: "HR 145-151 bpm. Same pace guidelines as easy run."
    }
  },
  "rest": {
    name: "Rest Day",
    notes: "Full rest. Evening routine only."
  },
  "optional": {
    name: "Optional Day",
    notes: "Walk/Run #3, zone 2 bike, or rest."
  }
};

const EXERCISE_CATEGORIES = {
  'Compound': ['low-bar-squat', 'bench-press', 'overhead-press', 'deadlift', 'barbell-row', 'back-squat-80'],
  'Accessory': ['hip-thrust', 'hip-thrust-80', 'bulgarian-split-squat', 'cable-pullthrough', 'ring-dips', 'pullups', 'slow-tempo-squat', 'slow-tempo-front-squat', 'farmer-carry'],
  'Mobility & Stability': ['step-downs', 'walking-lunges', 'monster-walks', 'single-leg-calf'],
  'Core': ['side-plank', 'core-circuit']
};

// Build a lookup: exerciseId → category
const _exerciseCategoryMap = {};
Object.entries(EXERCISE_CATEGORIES).forEach(([cat, ids]) => {
  ids.forEach(id => { _exerciseCategoryMap[id] = cat; });
});

// Get all unique exercises across all lift types and phases, grouped by category
function getAllExercises() {
  const seen = {};
  const exercises = [];

  const liftTypes = ['lift-a', 'lift-b', 'lift-c'];
  for (const liftType of liftTypes) {
    const liftData = WORKOUT_DETAILS[liftType];
    if (!liftData) continue;
    for (const phaseKey of Object.keys(liftData)) {
      const phase = liftData[phaseKey];
      if (!phase.exercises) continue;
      for (const ex of phase.exercises) {
        if (!seen[ex.id]) {
          seen[ex.id] = true;
          // Find which phases this exercise appears in
          const phases = [];
          for (const lt of liftTypes) {
            const ltd = WORKOUT_DETAILS[lt];
            if (!ltd) continue;
            for (const pk of Object.keys(ltd)) {
              if (ltd[pk].exercises?.some(e => e.id === ex.id)) {
                const phaseNum = parseInt(pk.replace('phase', ''));
                if (!phases.includes(phaseNum)) phases.push(phaseNum);
              }
            }
          }
          exercises.push({
            ...ex,
            phases: phases.sort(),
            category: _exerciseCategoryMap[ex.id] || 'Other'
          });
        }
      }
    }
  }

  return exercises;
}

// Get exercises grouped by category, sorted
function getExercisesByCategory() {
  const exercises = getAllExercises();
  const grouped = {};
  const categoryOrder = Object.keys(EXERCISE_CATEGORIES);

  for (const cat of categoryOrder) {
    grouped[cat] = [];
  }

  for (const ex of exercises) {
    if (!grouped[ex.category]) grouped[ex.category] = [];
    grouped[ex.category].push(ex);
  }

  // Remove empty categories
  for (const cat of Object.keys(grouped)) {
    if (grouped[cat].length === 0) delete grouped[cat];
  }

  return grouped;
}

const DAILY_ROUTINES = {
  morning: {
    short: {
      name: "Morning Routine - Short",
      duration: "5 min",
      exercises: [
        "Cat-cow: 8 reps",
        "Hip flexor stretch: 30 sec each side",
        "Glute squeeze: 10 reps, 3 sec hold (standing)"
      ]
    },
    long: {
      name: "Morning Routine - Long",
      duration: "12-15 min",
      exercises: [
        "Cat-cow: 10 reps",
        "World's greatest stretch: 4 each side",
        "Hip flexor stretch: 60 sec each side",
        "Glute bridges: 2x10 with 2 sec squeeze",
        "Dead bugs: 8 each side",
        "Chin tucks: 10 reps with 5 sec hold",
        "Wall posture check: 30 sec"
      ]
    }
  },
  evening: {
    name: "Evening Routine",
    duration: "15-20 min",
    required: true,
    exercises: [
      "Couch stretch: 90 sec each side",
      "Lizard pose: 60 sec each side",
      "Pigeon pose: 60 sec each side",
      "90/90 hip stretch: 45 sec each position",
      "Chest doorway stretch: 45 sec each side",
      "Thoracic rotation: 8 each side",
      "Chin tucks: 10 reps with 5 sec hold",
      "Supine pelvic tilts: 10 reps",
      "Dead bug: 6 each side, slow"
    ]
  }
};
