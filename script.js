/* =========================================================
   Student Toolkit — script.js
   Vanilla JS, no frameworks. Organised by feature.
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     Small shared helpers
     --------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $all = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* storage full or unavailable — fail silently */ }
    }
  };

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  function formatNumber(n, decimals = 2) {
    if (!isFinite(n)) return '—';
    return Number(n.toFixed(decimals)).toString();
  }

  /* ---------------------------------------------------------
     Tool registry — used by Home (quick access / popular /
     search) and the Dashboard quick links.
     --------------------------------------------------------- */
  const TOOLS = [
    { id: 'cgpa', name: 'CGPA Calculator', desc: 'Weighted CGPA across semesters', icon: 'CG', keywords: 'cgpa semester gpa credit weighted' },
    { id: 'sgpa', name: 'SGPA Calculator', desc: 'Per-semester grade point average', icon: 'SG', keywords: 'sgpa subject grade point semester' },
    { id: 'attendance', name: 'Attendance Calculator', desc: '75% rule, shortfall & buffer', icon: 'AT', keywords: 'attendance percentage classes bunk 75' },
    { id: 'percentage', name: 'Percentage Tools', desc: 'Marks, CGPA & percentage converters', icon: '%', keywords: 'percentage marks converter cgpa' },
    { id: 'timer', name: 'Study Timer', desc: 'Pomodoro focus sessions', icon: '⏱', keywords: 'timer pomodoro focus study break' },
    { id: 'converter', name: 'Unit Converter', desc: 'Length, weight, time & more', icon: '⇄', keywords: 'unit converter length weight temperature time data speed area energy' },
    { id: 'grade', name: 'Grade Calculator', desc: 'Marks to letter grade', icon: 'GR', keywords: 'grade letter marks scale' },
    { id: 'notes', name: 'Quick Notes', desc: 'Save quick notes locally', icon: 'NT', keywords: 'notes note write save' },
    { id: 'dashboard', name: 'Dashboard', desc: 'Your saved stats at a glance', icon: 'DB', keywords: 'dashboard overview stats' }
  ];
  const POPULAR_IDS = ['cgpa', 'attendance', 'timer', 'sgpa'];

  const QUOTES = [
    '“Discipline is choosing between what you want now and what you want most.”',
    '“Small, consistent effort beats last-minute panic.”',
    '“Attendance today is peace of mind before the exam.”',
    '“Your CGPA is a summary, not your ceiling.”',
    '“Focus for 25 minutes. Rest for 5. Repeat.”',
    '“Done is better than perfect — submit it.”'
  ];

  /* ---------------------------------------------------------
     Router — shows one .page section at a time and keeps
     the nav + recently-used list in sync.
     --------------------------------------------------------- */
  const Router = (() => {
    const pages = $all('.page');
    const navLinks = $all('[data-route]');
    const validRoutes = pages.map(p => p.dataset.page);

    function currentRoute() {
      const hash = location.hash.replace('#', '');
      return validRoutes.includes(hash) ? hash : 'home';
    }

    function render() {
      const route = currentRoute();
      pages.forEach(p => { p.hidden = p.dataset.page !== route; });
      navLinks.forEach(a => a.classList.toggle('is-active', a.dataset.route === route));
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
      document.title = route === 'home'
        ? 'Student Toolkit — Everything a student needs, in one place'
        : `${TOOLS.find(t => t.id === route)?.name || 'Student Toolkit'} — Student Toolkit`;

      if (route !== 'home') recordRecent(route);
      if (route === 'dashboard') Dashboard.refresh();
      if (route === 'home') Home.refresh();

      // close mobile nav on navigation
      $('#mainNav').classList.remove('is-open');
      $('#navToggle').setAttribute('aria-expanded', 'false');
    }

    function recordRecent(route) {
      let recent = store.get('st_recent', []);
      recent = recent.filter(r => r !== route);
      recent.unshift(route);
      recent = recent.slice(0, 4);
      store.set('st_recent', recent);
    }

    function init() {
      window.addEventListener('hashchange', render);
      render();
    }

    return { init, currentRoute };
  })();

  /* ---------------------------------------------------------
     Theme toggle (persisted)
     --------------------------------------------------------- */
  const Theme = (() => {
    function apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      const btn = $('#themeToggle');
      const isLight = theme === 'light';
      btn.setAttribute('aria-pressed', String(isLight));
      btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    }
    function init() {
      const saved = store.get('st_theme', null);
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      apply(saved || (prefersLight ? 'light' : 'dark'));
      $('#themeToggle').addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        apply(next);
        store.set('st_theme', next);
      });
    }
    return { init };
  })();

  /* ---------------------------------------------------------
     Mobile nav toggle
     --------------------------------------------------------- */
  function initMobileNav() {
    const toggle = $('#navToggle');
    const nav = $('#mainNav');
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });
  }

  /* ---------------------------------------------------------
     HOME page — quick access, recent, popular, search, quote
     --------------------------------------------------------- */
  const Home = (() => {
    function cardHTML(tool) {
      return `<a class="tool-link-card" href="#${tool.id}" data-route="${tool.id}">
        <span class="tlc-icon">${tool.icon}</span>
        <h3>${tool.name}</h3>
        <p>${tool.desc}</p>
      </a>`;
    }

    function renderGrid(el, tools) {
      el.innerHTML = tools.map(cardHTML).join('');
    }

    function refresh() {
      renderGrid($('#quickAccessGrid'), TOOLS.filter(t => t.id !== 'dashboard' && t.id !== 'notes').slice(0, 6));
      renderGrid($('#popularGrid'), TOOLS.filter(t => POPULAR_IDS.includes(t.id)));

      const recentIds = store.get('st_recent', []).filter(id => TOOLS.some(t => t.id === id));
      const recentSection = $('#recentSection');
      if (recentIds.length) {
        renderGrid($('#recentGrid'), recentIds.map(id => TOOLS.find(t => t.id === id)));
        recentSection.hidden = false;
      } else {
        recentSection.hidden = true;
      }

      $('#quoteText').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    }

    function initSearch() {
      const form = $('#searchForm');
      const input = $('#toolSearch');
      form.addEventListener('submit', e => {
        e.preventDefault();
        const q = input.value.trim().toLowerCase();
        if (!q) return;
        const match = TOOLS.find(t =>
          t.name.toLowerCase().includes(q) || t.keywords.includes(q)
        ) || TOOLS.find(t => t.keywords.split(' ').some(k => k.startsWith(q)));
        if (match) {
          location.hash = match.id;
          input.value = '';
        } else {
          showToast('No tool matched that search — try a different word.');
        }
      });
    }

    return { refresh, initSearch };
  })();

  /* ---------------------------------------------------------
     DASHBOARD page
     --------------------------------------------------------- */
  const Dashboard = (() => {
    function refresh() {
      const cgpa = store.get('st_last_cgpa', null);
      $('#statCgpa').textContent = cgpa !== null ? formatNumber(cgpa) : '—';

      const att = store.get('st_last_attendance', null);
      $('#statAttendance').textContent = att !== null ? `${formatNumber(att, 1)}%` : '—';

      $('#statSessions').textContent = store.get('st_sessions', 0);
      $('#statNotes').textContent = store.get('st_notes', []).length;

      $('#dashboardLinks').innerHTML = TOOLS.filter(t => t.id !== 'dashboard')
        .map(t => `<a class="tool-link-card" href="#${t.id}" data-route="${t.id}">
          <span class="tlc-icon">${t.icon}</span><h3>${t.name}</h3><p>${t.desc}</p>
        </a>`).join('');
    }
    return { refresh };
  })();

  /* ---------------------------------------------------------
     CGPA CALCULATOR
     --------------------------------------------------------- */
  const CgpaCalc = (() => {
    let rows = [{ sgpa: '', credits: '' }, { sgpa: '', credits: '' }];

    function render() {
      const container = $('#cgpaRows');
      container.innerHTML = rows.map((row, i) => `
        <div class="dynamic-row" data-index="${i}">
          <div class="field">
            <label for="cgpa-sgpa-${i}">Semester ${i + 1} SGPA</label>
            <input type="number" id="cgpa-sgpa-${i}" class="cgpa-sgpa" min="0" max="10" step="0.01" value="${row.sgpa}" placeholder="e.g. 8.5">
          </div>
          <div class="field">
            <label for="cgpa-credits-${i}">Credits</label>
            <input type="number" id="cgpa-credits-${i}" class="cgpa-credits" min="0" step="0.5" value="${row.credits}" placeholder="24">
          </div>
          <div class="field"></div>
          <button type="button" class="row-remove" data-remove="${i}" aria-label="Remove semester ${i + 1}">×</button>
        </div>
      `).join('');

      $all('.cgpa-sgpa', container).forEach((el, i) => el.addEventListener('input', () => { rows[i].sgpa = el.value; }));
      $all('.cgpa-credits', container).forEach((el, i) => el.addEventListener('input', () => { rows[i].credits = el.value; }));
      $all('[data-remove]', container).forEach(btn => btn.addEventListener('click', () => {
        if (rows.length <= 1) { showToast('Keep at least one semester.'); return; }
        rows.splice(Number(btn.dataset.remove), 1);
        render();
      }));
    }

    function calculate() {
      const errEl = $('#cgpaError');
      let totalCredits = 0, weightedSum = 0, hasValidRow = false;

      for (const row of rows) {
        if (row.sgpa === '' && row.credits === '') continue;
        const sgpa = parseFloat(row.sgpa);
        const credits = parseFloat(row.credits);
        if (isNaN(sgpa) || isNaN(credits) || sgpa < 0 || sgpa > 10 || credits < 0) {
          errEl.textContent = 'Each SGPA must be between 0–10 and credits must be a positive number.';
          errEl.hidden = false;
          return;
        }
        totalCredits += credits;
        weightedSum += sgpa * credits;
        hasValidRow = true;
      }

      errEl.hidden = true;
      const cgpa = hasValidRow && totalCredits > 0 ? weightedSum / totalCredits : 0;
      $('#cgpaTotalCredits').textContent = formatNumber(totalCredits, 1);
      $('#cgpaResult').textContent = formatNumber(cgpa, 2);
      if (hasValidRow) store.set('st_last_cgpa', cgpa);
    }

    function init() {
      render();
      calculate();
      $('#cgpaForm').addEventListener('input', calculate);
      $('#cgpaAddRow').addEventListener('click', () => { rows.push({ sgpa: '', credits: '' }); render(); calculate(); });
      $('#cgpaReset').addEventListener('click', () => {
        rows = [{ sgpa: '', credits: '' }, { sgpa: '', credits: '' }];
        render(); calculate();
        showToast('CGPA calculator reset.');
      });
    }
    return { init };
  })();

  /* ---------------------------------------------------------
     SGPA CALCULATOR
     --------------------------------------------------------- */
  const SgpaCalc = (() => {
    const GRADE_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, P: 4, F: 0 };
    let rows = [{ name: '', credits: '', grade: 'O' }, { name: '', credits: '', grade: 'O' }];

    function gradeOptions(selected) {
      return Object.keys(GRADE_POINTS).map(g => `<option value="${g}" ${g === selected ? 'selected' : ''}>${g} (${GRADE_POINTS[g]})</option>`).join('');
    }

    function render() {
      const container = $('#sgpaRows');
      container.innerHTML = rows.map((row, i) => `
        <div class="dynamic-row" data-index="${i}">
          <div class="field">
            <label for="sgpa-name-${i}">Subject ${i + 1}</label>
            <input type="text" id="sgpa-name-${i}" class="sgpa-name" value="${row.name}" placeholder="e.g. Data Structures">
          </div>
          <div class="field">
            <label for="sgpa-credits-${i}">Credits</label>
            <input type="number" id="sgpa-credits-${i}" class="sgpa-credits" min="0" step="0.5" value="${row.credits}" placeholder="4">
          </div>
          <div class="field">
            <label for="sgpa-grade-${i}">Grade</label>
            <select id="sgpa-grade-${i}" class="sgpa-grade">${gradeOptions(row.grade)}</select>
          </div>
          <button type="button" class="row-remove" data-remove="${i}" aria-label="Remove subject ${i + 1}">×</button>
        </div>
      `).join('');

      $all('.sgpa-name', container).forEach((el, i) => el.addEventListener('input', () => { rows[i].name = el.value; }));
      $all('.sgpa-credits', container).forEach((el, i) => el.addEventListener('input', () => { rows[i].credits = el.value; }));
      $all('.sgpa-grade', container).forEach((el, i) => el.addEventListener('change', () => { rows[i].grade = el.value; calculate(); }));
      $all('[data-remove]', container).forEach(btn => btn.addEventListener('click', () => {
        if (rows.length <= 1) { showToast('Keep at least one subject.'); return; }
        rows.splice(Number(btn.dataset.remove), 1);
        render(); calculate();
      }));
    }

    function calculate() {
      const errEl = $('#sgpaError');
      let totalCredits = 0, weightedSum = 0, hasValidRow = false;

      for (const row of rows) {
        if (row.credits === '') continue;
        const credits = parseFloat(row.credits);
        if (isNaN(credits) || credits < 0) {
          errEl.textContent = 'Credits must be a positive number for every subject.';
          errEl.hidden = false;
          return;
        }
        totalCredits += credits;
        weightedSum += GRADE_POINTS[row.grade] * credits;
        hasValidRow = true;
      }

      errEl.hidden = true;
      const sgpa = hasValidRow && totalCredits > 0 ? weightedSum / totalCredits : 0;
      $('#sgpaTotalCredits').textContent = formatNumber(totalCredits, 1);
      $('#sgpaResult').textContent = formatNumber(sgpa, 2);
    }

    function init() {
      render();
      calculate();
      $('#sgpaForm').addEventListener('input', calculate);
      $('#sgpaAddRow').addEventListener('click', () => { rows.push({ name: '', credits: '', grade: 'O' }); render(); calculate(); });
      $('#sgpaReset').addEventListener('click', () => {
        rows = [{ name: '', credits: '', grade: 'O' }, { name: '', credits: '', grade: 'O' }];
        render(); calculate();
        showToast('SGPA calculator reset.');
      });
    }
    return { init };
  })();

  /* ---------------------------------------------------------
     ATTENDANCE CALCULATOR
     --------------------------------------------------------- */
  const AttendanceCalc = (() => {
    const REQUIRED = 0.75;

    function calculate(e) {
      if (e) e.preventDefault();
      const errEl = $('#attError');
      const total = parseFloat($('#attTotal').value);
      const attended = parseFloat($('#attAttended').value);

      if (isNaN(total) || isNaN(attended) || total <= 0 || attended < 0) {
        errEl.textContent = 'Enter a positive total and a valid attended count.';
        errEl.hidden = false;
        $('#attResultStrip').hidden = true;
        $('#attStatus').hidden = true;
        $('#attAdvice').hidden = true;
        return;
      }
      if (attended > total) {
        errEl.textContent = 'Classes attended cannot be more than total classes.';
        errEl.hidden = false;
        return;
      }
      errEl.hidden = true;

      const missed = total - attended;
      const percent = (attended / total) * 100;

      $('#attMissed').textContent = missed;
      $('#attPercent').textContent = `${formatNumber(percent, 1)}%`;
      $('#attResultStrip').hidden = false;

      const statusEl = $('#attStatus');
      const adviceEl = $('#attAdvice');
      statusEl.hidden = false;
      adviceEl.hidden = false;

      if (percent >= REQUIRED * 100) {
        statusEl.textContent = `✓ Above the ${REQUIRED * 100}% requirement`;
        statusEl.className = 'status-pill ok';
        const canMiss = Math.floor(attended / REQUIRED - total);
        adviceEl.textContent = canMiss > 0
          ? `You can miss up to ${canMiss} more class${canMiss === 1 ? '' : 'es'} in a row and stay at or above ${REQUIRED * 100}%.`
          : `You're right at the edge — missing another class will drop you below ${REQUIRED * 100}%.`;
      } else {
        statusEl.textContent = `✗ Below the ${REQUIRED * 100}% requirement`;
        statusEl.className = 'status-pill bad';
        const need = Math.ceil((REQUIRED * total - attended) / (1 - REQUIRED));
        adviceEl.textContent = `Attend the next ${need} class${need === 1 ? '' : 'es'} in a row (no misses) to reach ${REQUIRED * 100}%.`;
      }

      store.set('st_last_attendance', percent);
    }

    function init() {
      $('#attendanceForm').addEventListener('submit', calculate);
      $('#attReset').addEventListener('click', () => {
        $('#attendanceForm').reset();
        $('#attResultStrip').hidden = true;
        $('#attStatus').hidden = true;
        $('#attAdvice').hidden = true;
        $('#attError').hidden = true;
      });
    }
    return { init };
  })();

  /* ---------------------------------------------------------
     PERCENTAGE TOOLS
     --------------------------------------------------------- */
  const PercentageTools = () => {
    function marksToPercent() {
      const obtained = parseFloat($('#pMarksObtained').value);
      const total = parseFloat($('#pMarksTotal').value);
      const errEl = $('#pMarksError');
      if ($('#pMarksObtained').value === '' || $('#pMarksTotal').value === '') { $('#pMarksResult').textContent = '—'; errEl.hidden = true; return; }
      if (isNaN(obtained) || isNaN(total) || total <= 0 || obtained < 0) {
        errEl.textContent = 'Enter valid, non-negative marks and a positive total.'; errEl.hidden = false;
        $('#pMarksResult').textContent = '—'; return;
      }
      errEl.hidden = true;
      $('#pMarksResult').textContent = `${formatNumber((obtained / total) * 100, 2)}%`;
    }
    function cgpaToPercent() {
      const cgpa = parseFloat($('#pCgpaInput').value);
      const errEl = $('#pCgpaError');
      if ($('#pCgpaInput').value === '') { $('#pCgpaResult').textContent = '—'; errEl.hidden = true; return; }
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        errEl.textContent = 'CGPA must be between 0 and 10.'; errEl.hidden = false;
        $('#pCgpaResult').textContent = '—'; return;
      }
      errEl.hidden = true;
      $('#pCgpaResult').textContent = `${formatNumber(cgpa * 9.5, 2)}%`;
    }
    function percentToMarks() {
      const percent = parseFloat($('#pPercentInput').value);
      const total = parseFloat($('#pPercentTotal').value);
      const errEl = $('#pPercentError');
      if ($('#pPercentInput').value === '' || $('#pPercentTotal').value === '') { $('#pPercentResult').textContent = '—'; errEl.hidden = true; return; }
      if (isNaN(percent) || isNaN(total) || percent < 0 || percent > 100 || total <= 0) {
        errEl.textContent = 'Percentage must be 0–100 and total marks must be positive.'; errEl.hidden = false;
        $('#pPercentResult').textContent = '—'; return;
      }
      errEl.hidden = true;
      $('#pPercentResult').textContent = formatNumber((percent / 100) * total, 2);
    }
    function init() {
      ['pMarksObtained', 'pMarksTotal'].forEach(id => $(`#${id}`).addEventListener('input', marksToPercent));
      $('#pCgpaInput').addEventListener('input', cgpaToPercent);
      ['pPercentInput', 'pPercentTotal'].forEach(id => $(`#${id}`).addEventListener('input', percentToMarks));
    }
    return { init };
  };

  /* ---------------------------------------------------------
     STUDY TIMER
     --------------------------------------------------------- */
  const StudyTimer = (() => {
    let totalSeconds = 25 * 60;
    let remaining = totalSeconds;
    let intervalId = null;
    let running = false;

    function updateDisplay() {
      const m = Math.floor(remaining / 60).toString().padStart(2, '0');
      const s = Math.floor(remaining % 60).toString().padStart(2, '0');
      $('#timerDisplay').textContent = `${m}:${s}`;
    }

    function tick() {
      remaining -= 1;
      updateDisplay();
      if (remaining <= 0) {
        clearInterval(intervalId);
        running = false;
        intervalId = null;
        $('#timerStart').disabled = false;
        $('#timerStart').textContent = 'Start';
        $('#timerPause').disabled = true;
        completeSession();
      }
    }

    function completeSession() {
      const sessions = store.get('st_sessions', 0) + 1;
      store.set('st_sessions', sessions);
      $('#timerSessions').textContent = sessions;
      notify('Session complete', 'Nice work — time for a break.');
      showToast('Session complete! 🎉');
    }

    function notify(title, body) {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        try { new Notification(title, { body }); } catch (e) { /* ignore */ }
      }
    }

    function start() {
      if (running) return;
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      running = true;
      $('#timerStart').textContent = 'Running…';
      $('#timerStart').disabled = true;
      $('#timerPause').disabled = false;
      intervalId = setInterval(tick, 1000);
    }

    function pause() {
      if (!running) return;
      clearInterval(intervalId);
      running = false;
      $('#timerStart').disabled = false;
      $('#timerStart').textContent = 'Resume';
      $('#timerPause').disabled = true;
    }

    function reset() {
      clearInterval(intervalId);
      running = false;
      remaining = totalSeconds;
      updateDisplay();
      $('#timerStart').disabled = false;
      $('#timerStart').textContent = 'Start';
      $('#timerPause').disabled = true;
    }

    function setMode(minutes, btn) {
      totalSeconds = minutes * 60;
      remaining = totalSeconds;
      $all('.mode-btn').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      if (btn) { btn.classList.add('is-active'); btn.setAttribute('aria-selected', 'true'); }
      reset();
    }

    function init() {
      updateDisplay();
      $('#timerSessions').textContent = store.get('st_sessions', 0);

      $all('.mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(Number(btn.dataset.minutes), btn)));
      $('#timerStart').addEventListener('click', start);
      $('#timerPause').addEventListener('click', pause);
      $('#timerReset').addEventListener('click', reset);

      $('#timerCustomSet').addEventListener('click', () => {
        const val = parseInt($('#timerCustom').value, 10);
        if (isNaN(val) || val < 1 || val > 180) {
          showToast('Enter a custom duration between 1 and 180 minutes.');
          return;
        }
        $all('.mode-btn').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
        setMode(val, null);
        showToast(`Timer set to ${val} minutes.`);
      });
    }
    return { init };
  })();

  /* ---------------------------------------------------------
     UNIT CONVERTER
     --------------------------------------------------------- */
  const UnitConverter = (() => {
    // Each category maps unit -> multiplier to the category's base unit.
    // Temperature is handled specially (non-linear).
    const CATEGORIES = {
      length: { base: 'm', units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mile: 1609.344, yard: 0.9144, foot: 0.3048, inch: 0.0254 } },
      weight: { base: 'kg', units: { kg: 1, g: 0.001, mg: 0.000001, tonne: 1000, pound: 0.45359237, ounce: 0.028349523 } },
      time: { base: 'second', units: { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800 } },
      data: { base: 'byte', units: { byte: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4, bit: 0.125 } },
      speed: { base: 'm/s', units: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knot: 0.514444 } },
      area: { base: 'sqm', units: { sqm: 1, sqkm: 1000000, sqft: 0.092903, sqyd: 0.836127, acre: 4046.8564, hectare: 10000 } },
      energy: { base: 'joule', units: { joule: 1, kilojoule: 1000, calorie: 4.184, kilocalorie: 4184, 'watt-hour': 3600, 'kilowatt-hour': 3600000 } },
      temperature: { base: 'celsius', units: { celsius: null, fahrenheit: null, kelvin: null } }
    };

    function toCelsius(value, unit) {
      if (unit === 'celsius') return value;
      if (unit === 'fahrenheit') return (value - 32) * 5 / 9;
      if (unit === 'kelvin') return value - 273.15;
    }
    function fromCelsius(value, unit) {
      if (unit === 'celsius') return value;
      if (unit === 'fahrenheit') return (value * 9 / 5) + 32;
      if (unit === 'kelvin') return value + 273.15;
    }

    function populateUnitSelects(category) {
      const units = Object.keys(CATEGORIES[category].units);
      const fromSel = $('#convFrom');
      const toSel = $('#convTo');
      fromSel.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
      toSel.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
      fromSel.selectedIndex = 0;
      toSel.selectedIndex = units.length > 1 ? 1 : 0;
    }

    function convert() {
      const category = $('#convCategory').value;
      const value = parseFloat($('#convValue').value);
      const from = $('#convFrom').value;
      const to = $('#convTo').value;
      const resultEl = $('#convResult');

      if (isNaN(value)) { resultEl.textContent = '—'; return; }

      let result;
      if (category === 'temperature') {
        result = fromCelsius(toCelsius(value, from), to);
      } else {
        const def = CATEGORIES[category];
        const baseValue = value * def.units[from];
        result = baseValue / def.units[to];
      }
      resultEl.textContent = `${formatNumber(result, 6)} ${to}`;
    }

    function init() {
      const categorySel = $('#convCategory');
      populateUnitSelects(categorySel.value);
      convert();

      categorySel.addEventListener('change', () => { populateUnitSelects(categorySel.value); convert(); });
      ['#convValue', '#convFrom', '#convTo'].forEach(sel => $(sel).addEventListener('input', convert));
      $('#convSwap').addEventListener('click', () => {
        const fromSel = $('#convFrom'), toSel = $('#convTo');
        const tmp = fromSel.value;
        fromSel.value = toSel.value;
        toSel.value = tmp;
        convert();
      });
    }
    return { init };
  })();

  /* ---------------------------------------------------------
     GRADE CALCULATOR — scale is easy to edit right here.
     --------------------------------------------------------- */
  const GradeCalc = (() => {
    const GRADE_SCALE = [
      { min: 90, grade: 'O', desc: 'Outstanding' },
      { min: 80, grade: 'A+', desc: 'Excellent' },
      { min: 70, grade: 'A', desc: 'Very good' },
      { min: 60, grade: 'B+', desc: 'Good' },
      { min: 50, grade: 'B', desc: 'Above average' },
      { min: 40, grade: 'C', desc: 'Average' },
      { min: 35, grade: 'P', desc: 'Pass' },
      { min: 0, grade: 'F', desc: 'Fail' }
    ];

    function gradeFor(percent) {
      return GRADE_SCALE.find(g => percent >= g.min);
    }

    function calculate(e) {
      if (e) e.preventDefault();
      const errEl = $('#gradeError');
      const obtained = parseFloat($('#gradeObtained').value);
      const total = parseFloat($('#gradeTotal').value);

      if (isNaN(obtained) || isNaN(total) || total <= 0 || obtained < 0) {
        errEl.textContent = 'Enter valid, non-negative marks and a positive total.';
        errEl.hidden = false;
        $('#gradeResultStrip').hidden = true;
        return;
      }
      if (obtained > total) {
        errEl.textContent = 'Marks obtained cannot exceed the total.';
        errEl.hidden = false;
        return;
      }
      errEl.hidden = true;

      const percent = (obtained / total) * 100;
      const g = gradeFor(percent);
      $('#gradePercentResult').textContent = `${formatNumber(percent, 2)}%`;
      $('#gradeLetterResult').textContent = g.grade;
      $('#gradeDescResult').textContent = `${g.grade} — ${g.desc}`;
      $('#gradeResultStrip').hidden = false;
    }

    function init() {
      $('#gradeForm').addEventListener('submit', calculate);
      $('#gradeReset').addEventListener('click', () => {
        $('#gradeForm').reset();
        $('#gradeResultStrip').hidden = true;
        $('#gradeDescResult').textContent = '';
        $('#gradeError').hidden = true;
      });
    }
    return { init };
  })();

  /* ---------------------------------------------------------
     QUICK NOTES
     --------------------------------------------------------- */
  const Notes = (() => {
    let notes = store.get('st_notes', []);
    let editingId = null;
    let query = '';

    function save() { store.set('st_notes', notes); }

    function formatDate(ts) {
      const d = new Date(ts);
      return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function render() {
      const list = $('#notesList');
      const filtered = notes.filter(n => n.text.toLowerCase().includes(query.toLowerCase()));
      $('#notesEmpty').hidden = notes.length > 0;
      $('#notesEmpty').textContent = notes.length === 0 ? 'No notes yet — add one above.' : (filtered.length === 0 ? 'No notes match your search.' : '');
      $('#notesEmpty').hidden = filtered.length > 0;

      list.innerHTML = filtered.map(n => {
        if (editingId === n.id) {
          return `<li class="note-item" data-id="${n.id}">
            <textarea class="note-edit-input" rows="3">${escapeHtml(n.text)}</textarea>
            <div class="note-meta">
              <span class="note-date">${formatDate(n.created)}</span>
              <div class="note-actions">
                <button type="button" class="note-save">Save</button>
                <button type="button" class="note-cancel">Cancel</button>
              </div>
            </div>
          </li>`;
        }
        return `<li class="note-item" data-id="${n.id}">
          <p>${escapeHtml(n.text)}</p>
          <div class="note-meta">
            <span class="note-date">${formatDate(n.created)}</span>
            <div class="note-actions">
              <button type="button" class="note-edit">Edit</button>
              <button type="button" class="note-delete">Delete</button>
            </div>
          </div>
        </li>`;
      }).join('');

      $all('.note-item', list).forEach(item => {
        const id = item.dataset.id;
        const editBtn = $('.note-edit', item);
        const delBtn = $('.note-delete', item);
        const saveBtn = $('.note-save', item);
        const cancelBtn = $('.note-cancel', item);
        if (editBtn) editBtn.addEventListener('click', () => { editingId = id; render(); });
        if (delBtn) delBtn.addEventListener('click', () => {
          notes = notes.filter(n => n.id !== id);
          save(); render();
          showToast('Note deleted.');
        });
        if (saveBtn) saveBtn.addEventListener('click', () => {
          const val = $('.note-edit-input', item).value.trim();
          if (!val) { showToast('Note can\'t be empty.'); return; }
          const note = notes.find(n => n.id === id);
          note.text = val;
          editingId = null;
          save(); render();
          showToast('Note updated.');
        });
        if (cancelBtn) cancelBtn.addEventListener('click', () => { editingId = null; render(); });
      });
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function addNote() {
      const input = $('#noteInput');
      const val = input.value.trim();
      if (!val) { showToast('Write something before adding a note.'); return; }
      notes.unshift({ id: `n${Date.now()}`, text: val, created: Date.now() });
      input.value = '';
      save(); render();
      showToast('Note added.');
    }

    function init() {
      render();
      $('#noteAdd').addEventListener('click', addNote);
      $('#noteInput').addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote();
      });
      $('#noteSearch').addEventListener('input', e => { query = e.target.value; render(); });
    }
    return { init };
  })();

  /* ---------------------------------------------------------
     BOOTSTRAP
     --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    $('#footerYear').textContent = new Date().getFullYear();

    Theme.init();
    initMobileNav();
    Home.initSearch();
    CgpaCalc.init();
    SgpaCalc.init();
    AttendanceCalc.init();
    PercentageTools().init();
    StudyTimer.init();
    UnitConverter.init();
    GradeCalc.init();
    Notes.init();

    Router.init(); // render first, after all page modules are wired up
  });
})();