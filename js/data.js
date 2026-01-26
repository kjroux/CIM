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
        { id: "overhead-press", name: "Overhead Press", sets: 3, reps: 5 },
        { id: "hip-thrust", name: "Barbell Hip Thrust", sets: 3, reps: 10 },
        { id: "ring-dips", name: "Ring Dips", sets: 3, reps: 5, bodyweight: true },
        { id: "cable-pullthrough", name: "Cable Pull-Through", sets: 2, reps: 12 },
        { id: "plank", name: "Plank", sets: 2, reps: "30sec", bodyweight: true }
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
        { id: "hip-thrust", name: "Barbell Hip Thrust", sets: 3, reps: 8 }
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
        { id: "romanian-deadlift", name: "Romanian Deadlift", sets: 3, reps: 8 },
        { id: "slow-tempo-squat", name: "Slow Tempo Back Squat", sets: 2, reps: 6, notes: "4 sec down, 1 sec up, 60%" },
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
        { id: "front-squat", name: "Front Squat", sets: 3, reps: 8 },
        { id: "hip-thrust", name: "Barbell Hip Thrust", sets: 4, reps: 8 },
        { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", sets: 3, reps: 8 },
        { id: "step-ups", name: "Step-Ups", bodyweight: true, sets: 3, reps: 10 },
        { id: "single-leg-calf", name: "Single-Leg Calf Raises", bodyweight: true, sets: 2, reps: 12 },
        { id: "core-circuit", name: "Core Circuit", sets: 1, reps: "5min", bodyweight: true }
      ]
    }
  },
  "walk-run": {
    phase1: {
      name: "Walk/Run + Mobility",
      duration: "50-60 min",
      weeks: {
        1: { protocol: "Run 2min / Walk 2min x 6", totalTime: 24, runningTime: 12 },
        2: { protocol: "Run 3min / Walk 2min x 5", totalTime: 25, runningTime: 15 },
        3: { protocol: "Run 4min / Walk 1min x 6", totalTime: 30, runningTime: 24 },
        4: { protocol: "Run 5min / Walk 1min x 5", totalTime: 30, runningTime: 25 }
      },
      notes: "Treadmill, HR 130-140 bpm, 1% incline, 170-180 spm"
    }
  },
  "easy-run": {
    name: "Easy Run",
    notes: "HR below 145, target 130-140 bpm. Let HR dictate pace (probably 8:30-9:30/mile). 170-180 spm cadence."
  },
  "easy-run-strides": {
    name: "Easy Run + Strides",
    notes: "HR below 145 for run. Then 6-8 x 15sec strides at fast but controlled pace, 45-60sec recovery between."
  },
  "long-run": {
    name: "Long Run",
    notes: "HR below 145, target 130-140 bpm. Same pace guidelines as easy run."
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
