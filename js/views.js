/* ============================================================
   MindPalace — View Layer
   All UI rendering and event binding
   ============================================================ */

/* ============================================================
   MindPalace — View Layer v3
   Dashboard · Daily · Phases+Exam · JobBoard
   ============================================================ */

const Views = (() => {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  function h(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function dayName() { return ['日','一','二','三','四','五','六'][new Date().getDay()]; }
  function daysBetween(a, b) { return Math.ceil((new Date(b) - new Date(a)) / 86400000); }

  function phaseStatusLabel(p) {
    if (p.status === 'completed') return '<span class="status-badge done">已结束</span>';
    if (p.status === 'delayed' && p.delayedUntil) return `<span class="status-badge delayed">已延期 · ${p.delayedUntil}</span>`;
    if (p.deadline && daysBetween(today(), p.deadline) <= 3 && daysBetween(today(), p.deadline) >= 0) return '<span class="status-badge warn">即将到期</span>';
    if (p.deadline && today() >= p.deadline) return '<span class="status-badge overdue">已过期 · 需要考试</span>';
    if (p.deadline) return `<span class="status-badge active">${daysBetween(today(), p.deadline)} 天剩余</span>`;
    return '<span class="status-badge active">进行中</span>';
  }

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function renderDashboard() {
    const ug = Store.getUltimateGoal();
    const activePhase = Store.getActivePhase();
    const body = $('#app-body');

    let html = '<div class="page-header"><div class="page-title">仪表盘</div><div class="page-subtitle">' + today() + ' · ' + dayName() + '曜日</div></div><div class="page-body">';

    /* Ultimate Goal card */
    if (ug) {
      html += `<div class="ug-card"><div class="ug-header"><span class="ug-icon">🎯</span><span class="ug-title">${h(ug.title)}</span><button class="btn btn-ghost btn-sm ug-edit-btn">✎</button></div>${ug.description ? `<div class="ug-desc">${h(ug.description)}</div>` : ''}</div>`;
    } else {
      html += `<div class="ug-card ug-empty"><div class="ug-header"><span class="ug-icon">🎯</span><span class="ug-title text-tertiary">设定你的终极目标</span><button class="btn btn-primary btn-sm ug-edit-btn">设定</button></div><div class="ug-desc text-tertiary">如：毕业后拿到 ML/CV/算法 offer</div></div>`;
    }

    /* Active Phase */
    if (activePhase) {
      const stats = Store.getPhaseStats(activePhase.id);
      const ld = activePhase.deadline || activePhase.delayedUntil;
      const progress = stats.taskTotal > 0 ? Math.round(stats.taskCompleted / stats.taskTotal * 100) : 0;
      const needsExam = activePhase.deadline && today() >= (activePhase.delayedUntil || activePhase.deadline) && activePhase.status === 'active';

      html += `<div class="phase-overview mt-16">
        <div class="phase-overview-header">
          <div><span class="phase-overview-title">${h(activePhase.title)}</span>${phaseStatusLabel(activePhase)}</div>
          <div class="flex gap-8">
            ${needsExam ? `<button class="btn btn-sm btn-primary phase-exam-btn" data-id="${activePhase.id}">📝 考试</button>` : ''}
            <button class="btn btn-sm btn-ghost phase-edit-btn" data-id="${activePhase.id}">✎</button>
          </div>
        </div>
        <div class="phase-overview-meta">${activePhase.startDate}${activePhase.endDate ? ' ~ ' + activePhase.endDate : ''}${ld ? ' · 截止 ' + ld : ''}${activePhase.description ? ' · ' + h(activePhase.description) : ''}</div>
        ${activePhase.examItems.length > 0 ? `<div class="phase-exam-preview">考试：${stats.examPassed}/${stats.examTotal} 项通过</div>` : ''}
      </div>`;

      /* Stats */
      html += `<div class="grid-3 mt-16 mb-16"><div class="stat-card"><div class="stat-value">${stats.goalCompleted}/${stats.goalTotal}</div><div class="stat-label">目标</div></div><div class="stat-card"><div class="stat-value">${stats.taskCompleted}/${stats.taskTotal}</div><div class="stat-label">任务</div></div><div class="stat-card"><div class="stat-value">${progress}%</div><div class="stat-label">进度</div></div></div>`;

      if (progress > 0) html += `<div class="progress-bar-container mb-20"><div class="progress-bar" style="width:${progress}%"></div></div>`;

      const goals = Store.getGoals(activePhase.id);
      html += `<div id="goal-list">${renderGoalCards(activePhase.id, goals)}</div><button class="btn btn-primary w-full mt-16" id="new-goal-btn">+ 新建目标</button>`;
    } else {
      html += `<div class="empty-state mt-20"><div class="empty-state-icon">📅</div><div class="empty-state-text">还没有阶段</div><button class="btn btn-primary" id="first-phase-btn">+ 创建第一个阶段</button></div>`;
    }

    html += '</div>';
    body.innerHTML = html;

    /* Bind events */
    if (ug) {
      $('.ug-edit-btn', body).addEventListener('click', showUltimateGoalEditor);
    } else {
      $('.ug-edit-btn', body).addEventListener('click', showUltimateGoalEditor);
    }

    if (activePhase) {
      bindGoalEvents(activePhase.id);
      $('#new-goal-btn', body).addEventListener('click', () => showGoalEditor(activePhase.id, null));
      const examBtn = $('.phase-exam-btn', body);
      if (examBtn) examBtn.addEventListener('click', () => showExamModal(activePhase.id));
      $('.phase-edit-btn', body).addEventListener('click', () => showPhaseEditor(activePhase.id));
      /* Check deadline on load */
      const ld = activePhase.deadline;
      if (ld && today() >= (activePhase.delayedUntil || ld) && activePhase.status === 'active' && activePhase.examItems.length > 0) {
        showExamModal(activePhase.id);
      }
    } else {
      $('#first-phase-btn', body)?.addEventListener('click', () => showPhaseEditor(null));
    }
  }

  /* Goal cards (same as v2, reused) */
  function renderGoalCards(phaseId, goals) {
    if (!goals.length) return `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">还没有目标</div></div>`;
    return goals.map(goal => {
      const tasks = Store.getTasks(goal.id);
      const done = tasks.filter(t => t.completed).length;
      const total = tasks.length;
      const p = total > 0 ? Math.round(done / total * 100) : 0;
      return `<div class="goal-card${goal.completed ? ' goal-done' : ''}" data-goal-id="${goal.id}">
        <div class="goal-body">
          <div class="goal-title-row">
            <button class="goal-check" data-action="toggle-goal" data-id="${goal.id}">${goal.completed ? '✓' : '○'}</button>
            <div class="goal-text"><div class="goal-title">${h(goal.title)}</div>${goal.description ? `<div class="goal-desc">${h(goal.description)}</div>` : ''}</div>
          </div>
          <div class="goal-meta"><span class="goal-progress-text">${done}/${total}</span><button class="btn btn-ghost btn-sm" data-action="edit-goal" data-id="${goal.id}">✎</button><button class="btn btn-ghost btn-sm" data-action="delete-goal" data-id="${goal.id}">🗑</button></div>
        </div>
        ${total > 0 ? `<div class="goal-progress-bar-container"><div class="goal-progress-bar" style="width:${p}%"></div></div>` : ''}
        <div class="task-list" data-goal-id="${goal.id}">${tasks.map(t => `<div class="task-item${t.completed ? ' task-done' : ''}"><button class="task-check" data-action="toggle-task" data-id="${t.id}">${t.completed ? '✓' : '○'}</button><span class="task-title">${h(t.title)}</span><button class="task-del" data-action="delete-task" data-id="${t.id}">×</button></div>`).join('')}
          ${!goal.completed ? `<div class="task-add-form"><input type="text" class="task-add-input" placeholder="添加小任务..." /><button class="btn btn-sm btn-ghost task-add-btn">添加</button></div>` : ''}
        </div>
        <div class="goal-footer"><button class="btn btn-sm ${goal.completed ? 'btn-ghost' : 'btn-primary'}" data-action="toggle-goal" data-id="${goal.id}">${goal.completed ? '↩ 重新打开' : '✓ 标记完成'}</button></div>
      </div>`;
    }).join('');
  }

  function bindGoalEvents(phaseId) {
    const list = $('#goal-list'); if (!list) return;
    list.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]'); if (!t) return;
      const { action, id } = t.dataset;
      switch (action) {
        case 'toggle-goal': if (id) Store.toggleGoal(id); App.render(); break;
        case 'toggle-task': if (id) Store.toggleTask(id); App.render(); break;
        case 'delete-task': if (id && confirm('删除这个任务？')) { Store.deleteTask(id); App.render(); } break;
        case 'edit-goal': if (id) showGoalEditor(phaseId, id); break;
        case 'delete-goal': if (id && confirm('删除这个目标？相关任务也会被删除。')) { Store.deleteGoal(id); App.render(); } break;
      }
    });
    list.querySelectorAll('.task-add-form').forEach(form => {
      const input = form.querySelector('.task-add-input');
      const btn = form.querySelector('.task-add-btn');
      const goalId = form.closest('.task-list').dataset.goalId;
      const doAdd = () => { const title = input.value.trim(); if (!title) return; Store.addTask({ goalId, title }); App.render(); };
      btn.addEventListener('click', doAdd);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
    });
  }

  /* ============================================================
     DAILY TASKS
     ============================================================ */
  function renderDaily() {
    const activePhase = Store.getActivePhase();
    const t = today();
    const body = $('#app-body');
    const dName = '周' + dayName();

    if (!activePhase) {
      body.innerHTML = `<div class="page-header"><div class="page-title">每日任务</div><div class="page-subtitle">${t} · ${dName}</div></div><div class="page-body"><div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">请先创建一个阶段</div></div></div>`;
      return;
    }

    const tasks = Store.getDailyTasks(t, activePhase.id);
    const stats = Store.getDailyStats(t, activePhase.id);

    body.innerHTML = `
      <div class="page-header">
        <div class="page-title">每日任务</div>
        <div class="page-subtitle">${t} · ${dName} · ${h(activePhase.title)}</div>
      </div>
      <div class="page-body">
        <div class="daily-stats mb-16">
          <span>${stats.done}/${stats.total} 完成</span>
          ${stats.total > 0 ? `<div class="progress-bar-container" style="margin-top:6px;"><div class="progress-bar" style="width:${Math.round(stats.done/Math.max(stats.total,1)*100)}%"></div></div>` : ''}
        </div>

        <div class="daily-list">
          ${tasks.map(task => `
            <div class="task-item${task.completed ? ' task-done' : ''}">
              <button class="task-check" data-action="toggle-daily" data-id="${task.id}">${task.completed ? '✓' : '○'}</button>
              <span class="task-title">${h(task.title)}</span>
              <button class="task-del" data-action="delete-daily" data-id="${task.id}">×</button>
            </div>
          `).join('')}
        </div>

        ${!tasks.length ? `<div class="empty-state">还没有今天的任务</div>` : ''}

        <div class="task-add-form mt-12">
          <input type="text" class="task-add-input" id="daily-input" placeholder="添加今日任务..." />
          <button class="btn btn-sm btn-primary" id="daily-add-btn">添加</button>
        </div>
      </div>
    `;

    /* Event delegation */
    $('.daily-list', body).addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]'); if (!t) return;
      if (t.dataset.action === 'toggle-daily') { Store.toggleDailyTask(t.dataset.id); App.render(); }
      else if (t.dataset.action === 'delete-daily') { if (confirm('删除？')) { Store.deleteDailyTask(t.dataset.id); App.render(); } }
    });

    const doAdd = () => {
      const title = $('#daily-input', body).value.trim();
      if (!title) return;
      Store.addDailyTask({ phaseId: activePhase.id, date: t, title });
      App.render();
    };
    $('#daily-add-btn', body).addEventListener('click', doAdd);
    $('#daily-input', body).addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
    setTimeout(() => $('#daily-input', body)?.focus(), 50);
  }

  /* ============================================================
     PHASE MANAGER (with exam)
     ============================================================ */
  function renderPhaseManager() {
    const phases = Store.getPhases();
    const active = Store.getActivePhase();
    const body = $('#app-body');

    body.innerHTML = `<div class="page-header"><div class="page-title">阶段管理</div><div class="page-subtitle">${phases.length} 个阶段</div></div><div class="page-body"><button class="btn btn-primary mb-20" id="new-phase-btn">+ 新建阶段</button>
      ${!phases.length ? `<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">还没有阶段</div></div>` : `<div class="phase-list">${phases.map(p => {
        const s = Store.getPhaseStats(p.id);
        const prog = s.taskTotal > 0 ? Math.round(s.taskCompleted / s.taskTotal * 100) : 0;
        const isActive = active && active.id === p.id;
        const ld = p.delayedUntil || p.deadline;
        const needsExam = p.deadline && today() >= ld && p.status === 'active';
        return `<div class="phase-card${isActive ? ' phase-active' : ''}"><div class="phase-card-header"><div><div class="phase-card-title">${h(p.title)}${isActive ? '<span class="phase-badge">当前</span>' : ''}${phaseStatusLabel(p)}</div><div class="phase-meta">${p.startDate}${p.endDate ? ' ~ '+p.endDate : ''}${ld ? ' · 截止 '+ld : ''}</div></div><div class="phase-card-actions">${!isActive ? `<button class="btn btn-sm btn-ghost phase-act-btn" data-id="${p.id}">设为当前</button>` : ''}${needsExam ? `<button class="btn btn-sm btn-primary phase-exam2-btn" data-id="${p.id}">📝 考试</button>` : ''}<button class="btn btn-sm btn-ghost phase-ed-btn" data-id="${p.id}">✎</button><button class="btn btn-sm btn-ghost phase-del-btn" data-id="${p.id}">🗑</button></div></div><div class="phase-stats"><span>目标 ${s.goalCompleted}/${s.goalTotal}</span><span>任务 ${s.taskCompleted}/${s.taskTotal}</span>${s.examTotal > 0 ? `<span>考试 ${s.examPassed}/${s.examTotal}</span>` : ''}<span>${prog}%</span></div>${s.taskTotal > 0 ? `<div class="goal-progress-bar-container"><div class="goal-progress-bar" style="width:${prog}%"></div></div>` : ''}${p.description ? `<div class="phase-desc">${h(p.description)}</div>` : ''}</div>`;
      }).join('')}</div>`}</div>`;

    $('#new-phase-btn', body).addEventListener('click', () => showPhaseEditor(null));
    $$('.phase-act-btn', body).forEach(b => b.addEventListener('click', () => { Store.setActivePhase(b.dataset.id); App.render(); }));
    $$('.phase-exam2-btn', body).forEach(b => b.addEventListener('click', () => showExamModal(b.dataset.id)));
    $$('.phase-ed-btn', body).forEach(b => b.addEventListener('click', () => showPhaseEditor(b.dataset.id)));
    $$('.phase-del-btn', body).forEach(b => b.addEventListener('click', () => { if (confirm('删除阶段及所有目标、任务？')) { Store.deletePhase(b.dataset.id); App.render(); } }));
  }

  /* ============================================================
     JOB BOARD
     ============================================================ */
  function renderJobBoard() {
    const listings = Store.getJobListings();
    const tags = Store.getJobTags();
    const body = $('#app-body');

    body.innerHTML = `<div class="page-header"><div class="page-title">求职看板</div><div class="page-subtitle">${listings.length} 个岗位 · 追踪 JD 和面经</div></div><div class="page-body"><div class="flex items-center justify-between mb-16"><div class="flex flex-wrap gap-8">${tags.map(t => `<span class="tag-badge clickable job-tag" data-tag="${h(t)}">${h(t)}</span>`).join('')}</div><button class="btn btn-primary" id="new-job-btn">+ 添加岗位</button></div><div id="job-list" class="job-list">${renderJobCards(listings)}</div></div>`;

    $('#new-job-btn', body).addEventListener('click', () => showJobEditor(null));
    $$('.job-tag', body).forEach(el => el.addEventListener('click', () => { $('#job-list', body).innerHTML = renderJobCards(Store.getJobListings(el.dataset.tag)); }));
    $$('.job-edit-btn', body).forEach(b => b.addEventListener('click', () => showJobEditor(b.dataset.id)));
    $$('.job-del-btn', body).forEach(b => b.addEventListener('click', () => { if (confirm('删除这个岗位？')) { Store.deleteJobListing(b.dataset.id); App.render(); } }));
  }

  function renderJobCards(listings) {
    if (!listings.length) return `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">还没有岗位信息</div></div>`;
    return listings.map(j => `
      <div class="job-card">
        <div class="job-card-header">
          <div><div class="job-title">${h(j.title)}</div>${j.company ? `<div class="job-company">${h(j.company)}</div>` : ''}</div>
          <div class="job-actions"><button class="btn btn-ghost btn-sm job-edit-btn" data-id="${j.id}">✎</button><button class="btn btn-ghost btn-sm job-del-btn" data-id="${j.id}">🗑</button></div>
        </div>
        ${j.tags && j.tags.length ? `<div class="job-tags">${j.tags.map(t => `<span class="tag-badge">${h(t)}</span>`).join('')}</div>` : ''}
        ${j.url ? `<div class="job-url"><a href="${h(j.url)}" target="_blank">${h(j.url)}</a></div>` : ''}
        ${j.requirements ? `<details class="job-section"><summary>岗位要求</summary><div class="job-detail">${h(j.requirements)}</div></details>` : ''}
        ${j.interviewQA ? `<details class="job-section"><summary>面经</summary><div class="job-detail">${h(j.interviewQA)}</div></details>` : ''}
      </div>
    `).join('');
  }

  /* ============================================================
     MODALS
     ============================================================ */

  /* Ultimate Goal Editor */
  function showUltimateGoalEditor() {
    const ug = Store.getUltimateGoal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><span class="modal-title">${ug ? '编辑终极目标' : '设定终极目标'}</span><button class="modal-close">✕</button></div><div class="modal-body"><div class="form-group"><label class="form-label">目标</label><input type="text" class="form-input" id="ug-title" placeholder="如：毕业后拿到 ML/CV/算法 offer" value="${ug ? h(ug.title) : ''}" /></div><div class="form-group"><label class="form-label">描述 <span class="text-tertiary">(可选)</span></label><textarea class="form-textarea" id="ug-desc" placeholder="你对这个终极目标的思考..." rows="3">${ug ? h(ug.description) : ''}</textarea></div></div><div class="modal-footer"><button class="btn btn-ghost ug-cancel">取消</button><button class="btn btn-primary ug-save">保存</button></div></div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.ug-cancel').addEventListener('click', close);
    overlay.querySelector('.ug-save').addEventListener('click', () => {
      const title = overlay.querySelector('#ug-title').value.trim();
      if (!title) return;
      Store.setUltimateGoal(title, overlay.querySelector('#ug-desc').value.trim());
      close(); App.render();
    });
    setTimeout(() => overlay.querySelector('#ug-title').focus(), 100);
  }

  /* Goal Editor */
  function showGoalEditor(phaseId, goalId) {
    const goal = goalId ? Store.getGoal(goalId) : null;
    const isNew = !goal;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><span class="modal-title">${isNew ? '新建目标' : '编辑目标'}</span><button class="modal-close">✕</button></div><div class="modal-body"><div class="form-group"><label class="form-label">目标名称</label><input type="text" class="form-input" id="goal-title" placeholder="大目标是什么？" value="${goal ? h(goal.title) : ''}" /></div><div class="form-group"><label class="form-label">描述 <span class="text-tertiary">(可选)</span></label><textarea class="form-textarea" id="goal-desc" placeholder="具体说明..." rows="3">${goal ? h(goal.description) : ''}</textarea></div></div><div class="modal-footer"><button class="btn btn-ghost gc-btn">取消</button><button class="btn btn-primary gs-btn">${isNew ? '创建' : '更新'}</button></div></div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.gc-btn').addEventListener('click', close);
    overlay.querySelector('.gs-btn').addEventListener('click', () => {
      const title = overlay.querySelector('#goal-title').value.trim(); if (!title) return;
      if (isNew) Store.addGoal({ phaseId, title, description: overlay.querySelector('#goal-desc').value.trim() });
      else Store.updateGoal(goalId, { title, description: overlay.querySelector('#goal-desc').value.trim() });
      close(); App.render();
    });
    setTimeout(() => overlay.querySelector('#goal-title').focus(), 100);
  }

  /* Phase Editor (extended) */
  function showPhaseEditor(phaseId) {
    const phase = phaseId ? Store.getPhase(phaseId) : null;
    const isNew = !phase;
    const td = today();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><span class="modal-title">${isNew ? '新建阶段' : '编辑阶段'}</span><button class="modal-close">✕</button></div><div class="modal-body">
      <div class="form-group"><label class="form-label">阶段名称</label><input type="text" class="form-input" id="p-title" placeholder="如：机器学习基础" value="${phase ? h(phase.title) : ''}" /></div>
      <div class="form-group"><label class="form-label">描述 <span class="text-tertiary">(可选)</span></label><input type="text" class="form-input" id="p-desc" placeholder="简短描述" value="${phase ? h(phase.description) : ''}" /></div>
      <div class="grid-2"><div class="form-group"><label class="form-label">开始日期</label><input type="date" class="form-input" id="p-start" value="${phase ? phase.startDate : td}" /></div><div class="form-group"><label class="form-label">结束日期 <span class="text-tertiary">(可选)</span></label><input type="date" class="form-input" id="p-end" value="${phase ? phase.endDate : ''}" /></div></div>
      <div class="form-group"><label class="form-label">考试截止日期 <span class="text-tertiary">(到期后自评考试)</span></label><input type="date" class="form-input" id="p-deadline" value="${phase ? phase.deadline : ''}" /></div>
      ${!isNew && phase && phase.examItems.length > 0 ? `<div class="form-group"><label class="form-label">考试项目 (${phase.examItems.length})</label><div class="exam-items-list">${phase.examItems.map(i => `<div class="exam-item-row"><span>${h(i.question)}</span><button class="btn btn-ghost btn-sm exam-del-item" data-pid="${phaseId}" data-iid="${i.id}">×</button></div>`).join('')}</div></div>` : ''}
      <div class="form-group"><label class="form-label">添加考试项目</label><div id="exam-add-area"><input type="text" class="form-input" id="exam-question" placeholder="输入一个自评问题..." /></div></div>
    </div><div class="modal-footer"><button class="btn btn-ghost pc-btn">取消</button><button class="btn btn-primary ps-btn">${isNew ? '创建' : '更新'}</button></div></div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.pc-btn').addEventListener('click', close);
    overlay.querySelector('.ps-btn').addEventListener('click', () => {
      const title = overlay.querySelector('#p-title').value.trim(); if (!title) return;
      const fields = { title, description: overlay.querySelector('#p-desc').value.trim(), startDate: overlay.querySelector('#p-start').value, endDate: overlay.querySelector('#p-end').value, deadline: overlay.querySelector('#p-deadline').value };
      if (isNew) { Store.addPhase(fields); App.navigate('/'); }
      else { Store.updatePhase(phaseId, fields); App.render(); }
      close();
    });
    /* Exam item add inline */
    const ea = overlay.querySelector('#exam-add-area');
    if (ea && !isNew && phaseId) {
      const input = overlay.querySelector('#exam-question');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) { Store.addExamItem(phaseId, input.value.trim()); input.value = ''; showPhaseEditor(phaseId); close(); }
      });
    }
    overlay.querySelectorAll('.exam-del-item').forEach(b => {
      b.addEventListener('click', () => { Store.deleteExamItem(b.dataset.pid, b.dataset.iid); close(); showPhaseEditor(b.dataset.pid); });
    });
    setTimeout(() => overlay.querySelector('#p-title').focus(), 100);
  }

  /* Exam Modal */
  function showExamModal(phaseId) {
    const phase = Store.getPhase(phaseId); if (!phase || !phase.examItems.length) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><span class="modal-title">📝 阶段考试：${h(phase.title)}</span><button class="modal-close">✕</button></div><div class="modal-body"><div class="exam-intro">截止日期已到，请逐项自评以下考试项目。所有项目通过后阶段才能结束。</div>
      <div class="exam-list">${phase.examItems.map(i => `<div class="exam-item" data-iid="${i.id}"><span class="exam-question">${h(i.question)}</span><div class="exam-toggle"><button class="exam-pass-btn${i.passed ? ' exam-passed' : ''}" data-iid="${i.id}" data-val="true">✓ 通过</button><button class="exam-fail-btn${!i.passed ? ' exam-failed' : ''}" data-iid="${i.id}" data-val="false">✗ 未通过</button></div></div>`).join('')}</div>
    </div><div class="modal-footer"><button class="btn btn-ghost ec-btn">取消</button><button class="btn btn-primary es-btn">提交考试</button></div></div>`;
    document.body.appendChild(overlay);
    /* Track pass/fail changes */
    const results = {};
    phase.examItems.forEach(i => results[i.id] = i.passed);
    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.ec-btn').addEventListener('click', close);
    overlay.querySelectorAll('.exam-pass-btn, .exam-fail-btn').forEach(b => {
      b.addEventListener('click', () => {
        const iid = b.dataset.iid;
        const passed = b.dataset.val === 'true';
        results[iid] = passed;
        const row = b.closest('.exam-item');
        row.querySelectorAll('.exam-pass-btn, .exam-fail-btn').forEach(x => x.classList.remove('exam-passed', 'exam-failed'));
        if (passed) row.querySelector('.exam-pass-btn').classList.add('exam-passed');
        else row.querySelector('.exam-fail-btn').classList.add('exam-failed');
      });
    });
    overlay.querySelector('.es-btn').addEventListener('click', () => {
      const data = Object.entries(results).map(([id, passed]) => ({ id, passed }));
      const updated = Store.submitPhaseExam(phaseId, data);
      if (updated && updated.status === 'completed') {
        close(); App.render();
      } else if (updated) {
        close(); alert(`有未通过项目，阶段已延期至 ${updated.delayedUntil}。请继续准备后重考。`); App.render();
      }
    });
  }

  /* Job Editor */
  function showJobEditor(listingId) {
    const job = listingId ? Store.getJobListing(listingId) : null;
    const isNew = !job;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-header"><span class="modal-title">${isNew ? '添加岗位' : '编辑岗位'}</span><button class="modal-close">✕</button></div><div class="modal-body">
      <div class="form-group"><label class="form-label">岗位名称</label><input type="text" class="form-input" id="j-title" placeholder="如：算法工程师" value="${job ? h(job.title) : ''}" /></div>
      <div class="form-group"><label class="form-label">公司</label><input type="text" class="form-input" id="j-company" placeholder="如：字节跳动" value="${job ? h(job.company) : ''}" /></div>
      <div class="form-group"><label class="form-label">链接</label><input type="url" class="form-input" id="j-url" placeholder="https://..." value="${job ? h(job.url) : ''}" /></div>
      <div class="form-group"><label class="form-label">标签 <span class="text-tertiary">(逗号分隔)</span></label><input type="text" class="form-input" id="j-tags" placeholder="机器学习, 计算机视觉" value="${job && job.tags ? h(job.tags.join(', ')) : ''}" /></div>
      <div class="form-group"><label class="form-label">岗位要求</label><textarea class="form-textarea" id="j-req" rows="4" placeholder="粘贴 JD 要求...">${job ? h(job.requirements) : ''}</textarea></div>
      <div class="form-group"><label class="form-label">面经</label><textarea class="form-textarea" id="j-qa" rows="4" placeholder="粘贴面经...">${job ? h(job.interviewQA) : ''}</textarea></div>
    </div><div class="modal-footer"><button class="btn btn-ghost jc-btn">取消</button><button class="btn btn-primary js-btn">${isNew ? '添加' : '更新'}</button></div></div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.jc-btn').addEventListener('click', close);
    overlay.querySelector('.js-btn').addEventListener('click', () => {
      const title = overlay.querySelector('#j-title').value.trim(); if (!title) return;
      const fields = { title, company: overlay.querySelector('#j-company').value.trim(), url: overlay.querySelector('#j-url').value.trim(), tags: overlay.querySelector('#j-tags').value.split(',').map(s => s.trim()).filter(Boolean), requirements: overlay.querySelector('#j-req').value.trim(), interviewQA: overlay.querySelector('#j-qa').value.trim() };
      if (isNew) Store.addJobListing(fields);
      else Store.updateJobListing(listingId, fields);
      close(); App.render();
    });
    setTimeout(() => overlay.querySelector('#j-title').focus(), 100);
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function render(route) {
    const map = { '/': renderDashboard, '/daily': renderDaily, '/phases': renderPhaseManager, '/jobs': renderJobBoard };
    (map[route] || renderDashboard)();
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.route === route));
  }

  return { render };
})();
