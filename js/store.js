/* ============================================================
   MindPalace — Data Store v3
   Ultimate Goal · Phases+Exam · Goals+Tasks · Daily · JobBoard
   ============================================================ */

const Store = (() => {
  const STORAGE_KEY = 'mindpalace_data';
  const SCHEMA_VERSION = 3;

  const defaultData = () => ({
    version: SCHEMA_VERSION,
    ultimateGoal: null,
    phases: [],
    goals: [],
    tasks: [],
    dailyTasks: [],
    jobListings: [],
    settings: { theme: 'light' },
    _meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  });

  let data = null;
  let saveTimer = null;

  /* --- Load / Save --- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { data = JSON.parse(raw); if (data.version !== SCHEMA_VERSION) data = migrate(data); }
      else data = defaultData();
    } catch (e) { console.warn('Store load failed', e); data = defaultData(); }
    return data;
  }

  function save() { if (!data) return; data._meta.updatedAt = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

  function saveDebounced() { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); }

  function migrate(old) {
    const fresh = defaultData();
    if (old.settings) fresh.settings = old.settings;
    if (old.phases) fresh.phases = old.phases.map(p => ({ ...p, deadline: p.deadline || '', status: p.status || 'active', examItems: p.examItems || [], delayCount: p.delayCount || 0, delayedUntil: p.delayedUntil || '' }));
    if (old.goals) fresh.goals = old.goals;
    if (old.tasks) fresh.tasks = old.tasks;
    if (old.ultimateGoal) fresh.ultimateGoal = old.ultimateGoal;
    if (old.dailyTasks) fresh.dailyTasks = old.dailyTasks;
    if (old.jobListings) fresh.jobListings = old.jobListings;
    return fresh;
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /* --- ULTIMATE GOAL --- */
  function getUltimateGoal() { return data.ultimateGoal; }
  function setUltimateGoal(title, description) {
    data.ultimateGoal = { id: data.ultimateGoal ? data.ultimateGoal.id : uid(), title: title || '', description: description || '', createdAt: data.ultimateGoal ? data.ultimateGoal.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString() };
    saveDebounced(); return data.ultimateGoal;
  }
  function completeUltimateGoal() { if (data.ultimateGoal) { data.ultimateGoal.completedAt = new Date().toISOString(); saveDebounced(); } }

  /* --- PHASES (extended) --- */
  function getPhases() { return [...data.phases].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  function getPhase(id) { return data.phases.find(p => p.id === id); }
  function getActivePhase() { return data.phases.find(p => p.isActive) || null; }

  function addPhase({ title, description, startDate, endDate, deadline }) {
    const now = new Date().toISOString();
    data.phases.forEach(p => p.isActive = false);
    const phase = { id: uid(), title: title || '', description: description || '', startDate: startDate || now.slice(0, 10), endDate: endDate || '', deadline: deadline || '', status: 'active', examItems: [], delayCount: 0, delayedUntil: '', isActive: true, createdAt: now };
    data.phases.push(phase); saveDebounced(); return phase;
  }

  function updatePhase(id, fields) { const phase = data.phases.find(p => p.id === id); if (!phase) return null; Object.assign(phase, fields); saveDebounced(); return phase; }
  function setActivePhase(id) { data.phases.forEach(p => p.isActive = (p.id === id)); saveDebounced(); }

  function checkPhaseDeadline(phaseId) {
    const phase = data.phases.find(p => p.id === phaseId);
    if (!phase || !phase.deadline) return { needsExam: false };
    const eff = phase.delayedUntil || phase.deadline;
    return { needsExam: new Date().toISOString().slice(0,10) >= eff && phase.status === 'active', phase };
  }

  function addExamItem(phaseId, question) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return null; phase.examItems.push({ id: uid(), question, passed: false }); saveDebounced(); return phase; }
  function deleteExamItem(phaseId, itemId) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return null; phase.examItems = phase.examItems.filter(i => i.id !== itemId); saveDebounced(); return phase; }

  function submitPhaseExam(phaseId, results) {
    const phase = data.phases.find(p => p.id === phaseId); if (!phase) return null;
    results.forEach(r => { const item = phase.examItems.find(i => i.id === r.id); if (item) item.passed = r.passed; });
    if (phase.examItems.every(i => i.passed)) { phase.status = 'completed'; }
    else { phase.status = 'delayed'; phase.delayCount = (phase.delayCount || 0) + 1; const base = phase.delayedUntil || phase.deadline; const d = new Date(base); d.setDate(d.getDate() + 7); phase.delayedUntil = d.toISOString().slice(0, 10); }
    saveDebounced(); return phase;
  }

  function deletePhase(id) { const gids = data.goals.filter(g => g.phaseId === id).map(g => g.id); data.tasks = data.tasks.filter(t => !gids.includes(t.goalId)); data.goals = data.goals.filter(g => g.phaseId !== id); data.dailyTasks = data.dailyTasks.filter(t => t.phaseId !== id); data.phases = data.phases.filter(p => p.id !== id); saveDebounced(); }

  /* --- GOALS --- */
  function getGoals(phaseId) { return data.goals.filter(g => g.phaseId === phaseId).sort((a, b) => { if (a.completed !== b.completed) return a.completed ? 1 : -1; return new Date(b.createdAt) - new Date(a.createdAt); }); }
  function getGoal(id) { return data.goals.find(g => g.id === id); }
  function addGoal({ phaseId, title, description }) { const now = new Date().toISOString(); const goal = { id: uid(), phaseId, title: title || '', description: description || '', completed: false, completedAt: null, createdAt: now, updatedAt: now }; data.goals.push(goal); saveDebounced(); return goal; }
  function updateGoal(id, fields) { const goal = data.goals.find(g => g.id === id); if (!goal) return null; Object.assign(goal, fields, { updatedAt: new Date().toISOString() }); saveDebounced(); return goal; }
  function toggleGoal(id) { const goal = data.goals.find(g => g.id === id); if (!goal) return null; goal.completed = !goal.completed; goal.completedAt = goal.completed ? new Date().toISOString() : null; goal.updatedAt = new Date().toISOString(); saveDebounced(); return goal; }
  function deleteGoal(id) { data.tasks = data.tasks.filter(t => t.goalId !== id); data.goals = data.goals.filter(g => g.id !== id); saveDebounced(); }

  /* --- TASKS --- */
  function getTasks(goalId) { return data.tasks.filter(t => t.goalId === goalId).sort((a, b) => { if (a.completed !== b.completed) return a.completed ? 1 : -1; return new Date(b.createdAt) - new Date(a.createdAt); }); }
  function getTask(id) { return data.tasks.find(t => t.id === id); }
  function addTask({ goalId, title }) { const task = { id: uid(), goalId, title: title || '', completed: false, completedAt: null, createdAt: new Date().toISOString() }; data.tasks.push(task); saveDebounced(); return task; }
  function updateTask(id, fields) { const task = data.tasks.find(t => t.id === id); if (!task) return null; Object.assign(task, fields); saveDebounced(); return task; }
  function toggleTask(id) { const task = data.tasks.find(t => t.id === id); if (!task) return null; task.completed = !task.completed; task.completedAt = task.completed ? new Date().toISOString() : null; saveDebounced(); return task; }
  function deleteTask(id) { data.tasks = data.tasks.filter(t => t.id !== id); saveDebounced(); }

  /* --- DAILY TASKS --- */
  function getDailyTasks(date, phaseId) { return data.dailyTasks.filter(t => t.date === date && (phaseId ? t.phaseId === phaseId : true)).sort((a, b) => (a.completed !== b.completed ? (a.completed ? 1 : -1) : 0)); }
  function getDailyStats(date, phaseId) { const tasks = getDailyTasks(date, phaseId); return { total: tasks.length, done: tasks.filter(t => t.completed).length }; }
  function addDailyTask({ phaseId, date, title }) { const task = { id: uid(), phaseId, date, title: title || '', completed: false, completedAt: null, createdAt: new Date().toISOString() }; data.dailyTasks.push(task); saveDebounced(); return task; }
  function toggleDailyTask(id) { const task = data.dailyTasks.find(t => t.id === id); if (!task) return null; task.completed = !task.completed; task.completedAt = task.completed ? new Date().toISOString() : null; saveDebounced(); return task; }
  function deleteDailyTask(id) { data.dailyTasks = data.dailyTasks.filter(t => t.id !== id); saveDebounced(); }

  /* --- JOB LISTINGS --- */
  function getJobListings(tag) { let list = data.jobListings; if (tag) list = list.filter(j => j.tags && j.tags.includes(tag)); return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  function getJobListing(id) { return data.jobListings.find(j => j.id === id); }
  function addJobListing({ title, company, requirements, interviewQA, url, tags }) { const listing = { id: uid(), title: title || '', company: company || '', requirements: requirements || '', interviewQA: interviewQA || '', url: url || '', tags: tags || [], createdAt: new Date().toISOString() }; data.jobListings.push(listing); saveDebounced(); return listing; }
  function updateJobListing(id, fields) { const listing = data.jobListings.find(j => j.id === id); if (!listing) return null; Object.assign(listing, fields); saveDebounced(); return listing; }
  function deleteJobListing(id) { data.jobListings = data.jobListings.filter(j => j.id !== id); saveDebounced(); }
  function getJobTags() { const s = new Set(); data.jobListings.forEach(j => j.tags && j.tags.forEach(t => s.add(t))); return [...s].sort(); }

  /* --- AGGREGATE --- */
  function getPhaseStats(phaseId) {
    const goals = data.goals.filter(g => g.phaseId === phaseId);
    const gids = goals.map(g => g.id);
    const tasks = data.tasks.filter(t => gids.includes(t.goalId));
    const phase = data.phases.find(p => p.id === phaseId);
    return { goalTotal: goals.length, goalCompleted: goals.filter(g => g.completed).length, taskTotal: tasks.length, taskCompleted: tasks.filter(t => t.completed).length, examPassed: phase ? phase.examItems.filter(i => i.passed).length : 0, examTotal: phase ? phase.examItems.length : 0 };
  }

  /* --- SETTINGS --- */
  function getSetting(key) { return data.settings[key]; }
  function setSetting(key, value) { data.settings[key] = value; save(); }

  /* --- INIT --- */
  load();

  return {
    getUltimateGoal, setUltimateGoal, completeUltimateGoal,
    getPhases, getPhase, getActivePhase,
    addPhase, updatePhase, deletePhase, setActivePhase,
    addExamItem, deleteExamItem, submitPhaseExam, checkPhaseDeadline,
    getGoals, getGoal, addGoal, updateGoal, toggleGoal, deleteGoal,
    getTasks, getTask, addTask, updateTask, toggleTask, deleteTask,
    getPhaseStats,
    getDailyTasks, getDailyStats, addDailyTask, toggleDailyTask, deleteDailyTask,
    getJobListings, getJobListing, getJobTags, addJobListing, updateJobListing, deleteJobListing,
    getSetting, setSetting, save,
  };
})();
