// app.js — CrewCare frontend shell: navigation, rendering, environment switch.
// Uses the backend stubs (data.js, trends.js, store.js, queue.js, triage.js)
// through their agreed names. Henry is replacing those backend files with his own code;
// this file only calls the agreed function names, so it should keep working.
(function () {
  'use strict';

  var T = window.CrewCareTrends, S = window.CrewCareStore, Q = window.CrewCareQueue,
      Tri = window.CrewCareTriage, G = window.CREWCARE_GUIDANCE, D = window.CREWCARE_DATA;

  var state = { screen: 'crew', astronautId: 'a1', bodyPart: 'heartRate', environment: 'Mars', earthMode: false };
  var charts = {};

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  function statusHtml(level, arrow) {
    var word = level === 'red' ? 'Red — act now' : level === 'amber' ? 'Amber — warn' : 'Green — OK';
    var span = el('span', 'status status-' + level, word + ' ' + (arrow || '→'));
    return span;
  }

  function readingsFor(id) { return S.loadReadings(id); }
  function astronaut(id) { return D.astronauts.find(function (a) { return a.id === id; }); }

  // ---- Navigation ----
  function show(screen) {
    state.screen = screen;
    document.querySelectorAll('section.screen').forEach(function (s) { s.classList.toggle('active', s.id === 'screen-' + screen); });
    document.querySelectorAll('nav.bottom button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-nav') === screen); });
    if (screen === 'crew') renderCrew();
    if (screen === 'detail') renderDetail();
    if (screen === 'charts') renderChartsScreen();
    if (screen === 'guidance') renderGuidance();
    if (screen === 'messages') renderOutbox();
    if (screen === 'inventory') renderInventory();
    if (screen === 'triage') renderTriage();
    window.scrollTo(0, 0);
  }

  // ---- Crew dashboard ----
  function renderCrew() {
    var grid = $('crew-grid'); grid.innerHTML = '';
    D.astronauts.forEach(function (a) {
      var rs = readingsFor(a.id);
      var overall = T.overallStatus(a, rs);
      var driving = overall.drivingIndicator ? T.INDICATORS[overall.drivingIndicator].label : 'All indicators steady';
      var card = el('button', 'card');
      card.innerHTML = '';
      var h = el('h3', null, a.name + ' — ' + a.role);
      var story = el('p', 'role', a.storyLabel);
      var statusLine = el('p');
      statusLine.appendChild(statusHtml(overall.level, T.trendArrow(a, overall.drivingIndicator || 'heartRate', rs)));
      var drive = el('p', null, overall.level === 'green' ? 'All indicators steady.' : 'Driving indicator: ' + driving + '.');
      card.appendChild(h); card.appendChild(story); card.appendChild(statusLine); card.appendChild(drive);
      card.addEventListener('click', function () { state.astronautId = a.id; show('detail'); });
      grid.appendChild(card);
    });
  }

  // ---- Body dashboard / astronaut detail ----
  var BODY_PARTS = [
    { key: 'heartRate', label: '❤️ Heart', indicator: 'heartRate' },
    { key: 'lungs', label: '🫁 Lungs', indicator: 'heartRate' },
    { key: 'sleep', label: '🧠 Brain / sleep', indicator: 'sleepHours' },
    { key: 'eyes', label: '👁️ Eyes', indicator: 'mood' },
    { key: 'muscles', label: '💪 Muscles / bones', indicator: 'heartRate' },
    { key: 'blood', label: '🩸 Blood', indicator: 'bloodSugar' },
    { key: 'mood', label: '🙂 Mood', indicator: 'mood' }
  ];

  function renderDetail() {
    var a = astronaut(state.astronautId);
    var rs = readingsFor(a.id);
    var overall = T.overallStatus(a, rs);
    var latest = rs[rs.length - 1];
    $('detail-name').textContent = a.name + ' — ' + a.role;
    $('detail-story').textContent = a.storyLabel + '. Baseline is their own pre-flight average.';
    var st = $('detail-status'); st.innerHTML = '';
    st.appendChild(statusHtml(overall.level, T.trendArrow(a, overall.drivingIndicator || 'heartRate', rs)));
    $('detail-readiness').textContent = T.readinessScore(a, rs);
    var grid = $('body-grid'); grid.innerHTML = '';
    BODY_PARTS.forEach(function (p) {
      var b = el('button', 'body-part', p.label);
      b.setAttribute('aria-pressed', state.bodyPart === p.key ? 'true' : 'false');
      b.addEventListener('click', function () { state.bodyPart = p.key; renderBodyInfo(); renderDetailChart(); });
      grid.appendChild(b);
    });
    renderBodyInfo();
    renderDetailChart();
    $('detail-radiation').textContent = 'Radiation so far: ' + latest.radiationMsvCumulative + ' mSv cumulative. Context only: ISS crew average about 1 mSv per day. That is an average, not a safety limit.';
    $('detail-sleep').textContent = 'Sleep last night: ' + latest.sleepHours + ' hours (scheduled 8.5 hours; ISS crew average about 6.1 hours). Readiness ' + T.readinessScore(a, rs) + ' / 100 from sleep, mood and resting heart-rate drift.';
    var ev = $('detail-evidence'); ev.innerHTML = '';
    G.EVIDENCE.forEach(function (panel) {
      var box = el('div', 'queue-item');
      box.appendChild(el('strong', null, panel.id + ' — ' + panel.title));
      box.appendChild(el('p', null, panel.summary));
      ev.appendChild(box);
    });
  }

  function renderBodyInfo() {
    var a = astronaut(state.astronautId);
    var rs = readingsFor(a.id);
    var part = BODY_PARTS.find(function (p) { return p.key === state.bodyPart; }) || BODY_PARTS[0];
    var latest = rs[rs.length - 1];
    var box = $('body-info'); box.innerHTML = '';
    if (part.key === 'eyes') {
      var sans = T.sansStatus(latest.eyeChangeUm);
      var p1 = el('p'); p1.appendChild(document.createTextNode('Eyes — retinal change ' + latest.eyeChangeUm + ' µm. Status: ')); p1.appendChild(statusHtml(sans, '→'));
      box.appendChild(p1);
      box.appendChild(el('p', null, 'Published SANS threshold: +20 micrometres is an early sign, +55 micrometres is concerning. This is the only published threshold in the app.'));
      return;
    }
    var ind = part.indicator;
    var level = T.indicatorStatus(a, ind, rs);
    var info = el('p');
    info.appendChild(document.createTextNode(part.label + ' — ' + T.INDICATORS[ind].label + ': ' + latest[T.INDICATORS[ind].field] + ' ' + T.INDICATORS[ind].unit + '. Status: '));
    info.appendChild(statusHtml(level, T.trendArrow(a, ind, rs)));
    box.appendChild(info);
    box.appendChild(el('p', null, T.plainReason(a, ind, rs)));
    var guideBtn = el('button', 'secondary', 'How to take this measurement');
    guideBtn.addEventListener('click', function () { $('guide-indicator').value = ind; show('guidance'); });
    box.appendChild(guideBtn);
  }

  function drawChart(canvas, series) {
    if (!window.Chart) { canvas.parentNode.appendChild(el('p', null, 'Charts need Chart.js, bundled in ./vendor/chart.umd.min.js.')); return; }
    if (charts[canvas.id]) charts[canvas.id].destroy();
    charts[canvas.id] = new Chart(canvas, {
      type: 'line',
      data: { labels: series.labels, datasets: [
        { label: series.label + ' (' + series.unit + ')', data: series.values, borderColor: '#0b5cad', tension: 0.2 },
        { label: 'Personal baseline (' + series.baseline + ' ' + series.unit + ')', data: series.labels.map(function () { return series.baseline; }), borderColor: '#888', borderDash: [6, 4], pointRadius: 0 }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 12 } } }, scales: { y: { title: { display: true, text: series.unit } } } }
    });
  }

  function renderDetailChart() {
    var a = astronaut(state.astronautId);
    var ind = $('chart-indicator').value;
    var series = T.trendSeries(a, ind, readingsFor(a.id), 30);
    drawChart($('detail-chart'), series);
    var first = series.values[0], last = series.values[series.values.length - 1];
    $('detail-caption').textContent = series.label + ' has moved from ' + first + ' to ' + last + ' ' + series.unit + ' over 30 days, against a personal baseline of ' + series.baseline + ' ' + series.unit + '.';
  }

  function renderChartsScreen() {
    var list = $('charts-list'); list.innerHTML = '';
    var a = astronaut(state.astronautId);
    Object.keys(T.INDICATORS).forEach(function (key) {
      var box = el('div', 'chart-box');
      box.appendChild(el('h3', null, T.INDICATORS[key].label));
      var cv = document.createElement('canvas'); cv.id = 'chart-' + key; cv.height = 160;
      box.appendChild(cv);
      box.appendChild(el('p', 'caption', T.plainReason(a, key, readingsFor(a.id))));
      list.appendChild(box);
      drawChart(cv, T.trendSeries(a, key, readingsFor(a.id), 30));
    });
  }

  // ---- Check-in ----
  function fillAstronautSelects() {
    [['ci-astronaut'], ['charts-astronaut'], ['msg-astronaut']].forEach(function (pair) {
      var sel = $(pair[0]); if (!sel) return; sel.innerHTML = '';
      D.astronauts.forEach(function (a) { var o = document.createElement('option'); o.value = a.id; o.textContent = a.name + ' — ' + a.role; sel.appendChild(o); });
    });
    var msgSel = $('msg-astronaut');
    var none = document.createElement('option'); none.value = ''; none.textContent = 'Whole crew'; msgSel.insertBefore(none, msgSel.firstChild);
  }

  // ---- Guidance ----
  function renderGuidance() {
    var key = $('guide-indicator').value;
    var g = G.GUIDANCE[key];
    var box = $('guide-box'); box.innerHTML = '';
    box.appendChild(el('h3', null, g.indicator + ' (' + g.unit + ')'));
    function block(title, items) {
      box.appendChild(el('h3', null, title));
      var ul = document.createElement('ul');
      (Array.isArray(items) ? items : [items]).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      box.appendChild(ul);
    }
    block('How to take it', g.howTo);
    block('Why it matters', g.whyItMatters);
    block('What a good reading looks like', g.goodReading);
    block('If it is off', g.ifOff);
    block('Quality check', g.qualityCheck);
    var ev = $('evidence-list'); ev.innerHTML = '';
    G.EVIDENCE.forEach(function (panel) {
      var b = el('div', 'queue-item');
      b.appendChild(el('strong', null, panel.id + ' — ' + panel.title));
      b.appendChild(el('p', null, panel.summary));
      b.appendChild(el('p', 'help', 'Appears in: ' + panel.appearsIn));
      ev.appendChild(b);
    });
  }

  // ---- Triage ----
  function renderTriage() {
    var box = $('triage-box'); box.innerHTML = '';
    var cur = Tri.getCurrent() || Tri.startTriage();
    if (cur.type === 'outcome') {
      var o = cur.outcome;
      var div = el('div', 'triage-step outcome');
      var title = el('p', 'question'); title.appendChild(document.createTextNode(o.title + ' — ')); title.appendChild(statusHtml(o.level, '→'));
      div.appendChild(title);
      div.appendChild(el('p', null, 'This app does not diagnose. It tells a non-doctor what to do now, step by step.'));
      [['Do now', o.doNow], ['Check next', o.checkNext], ['Prepare', o.prepare], ['Tell Earth', [o.tellEarth]]].forEach(function (pair) {
        div.appendChild(el('h3', null, pair[0]));
        var ul = document.createElement('ul');
        pair[1].forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
        div.appendChild(ul);
      });
      if (o.level === 'red') {
        var q = el('button', 'danger big', 'Queue this message to Earth');
        q.addEventListener('click', function () {
          Q.queueMessage(o.tellEarth, state.astronautId, state.environment);
          show('messages');
        });
        div.appendChild(q);
      }
      box.appendChild(div);
      return;
    }
    var step = cur.step;
    var div2 = el('div', 'triage-step');
    div2.appendChild(el('p', 'step-count', 'Step ' + step.step + ' of ' + step.total));
    div2.appendChild(el('p', 'question', step.question));
    step.options.forEach(function (opt, i) {
      var b = el('button', 'big', opt.label);
      b.addEventListener('click', function () { Tri.answerTriage(i); renderTriage(); });
      div2.appendChild(b);
    });
    box.appendChild(div2);
  }

  // ---- Messages / queue ----
  function renderOutbox() {
    var list = Q.listMessages();
    var box = $('outbox-list'); box.innerHTML = '';
    if (!list.length) { box.appendChild(el('p', null, 'No messages yet.')); return; }
    list.slice().reverse().forEach(function (m) {
      var item = el('div', 'queue-item');
      item.appendChild(el('p', null, m.text));
      var meta = el('p', 'help', m.environment + ' — ' + m.status.toUpperCase() + ' — sent ' + (m.status === 'sent' ? 'after its delay' : 'in ' + Math.max(0, Math.ceil((m.sendAt - Date.now()) / 1000)) + ' seconds (demo countdown)') + '. Created ' + new Date(m.createdAt).toLocaleString() + '.');
      item.appendChild(meta);
      box.appendChild(item);
    });
  }

  // ---- Inventory ----
  function renderInventory() {
    var box = $('inventory-list'); box.innerHTML = '';
    var today = new Date('2026-11-14');
    D.inventory.forEach(function (item) {
      var exp = new Date(item.expiryDate);
      var daysLeft = Math.round((exp - today) / 86400000);
      var flags = [];
      if (daysLeft <= 30) flags.push('Expiring soon — ' + daysLeft + ' days left');
      if (item.quantity <= item.lowStockAt) flags.push('Low stock — only ' + item.quantity + ' left');
      if (state.environment === 'Mars') flags.push('No resupply in Mars mode');
      var div = el('div', 'queue-item');
      div.appendChild(el('strong', null, item.name));
      div.appendChild(el('p', null, 'Quantity: ' + item.quantity + ' — Expiry: ' + item.expiryDate));
      if (flags.length) div.appendChild(el('p', 'flag', '⚠ ' + flags.join(' · ')));
      box.appendChild(div);
    });
  }

  // ---- Environment switch ----
  function setEnvironment(env) {
    state.environment = env;
    document.querySelectorAll('[data-env]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-env') === env ? 'true' : 'false'); });
    $('env-note').textContent = Q.ENVIRONMENTS[env].note + (env === 'Mars' ? ' Real delay 20–24 minutes one way; demo countdown is shortened to 30 seconds.' : '');
    renderInventory();
  }

  // ---- Wire up ----
  document.querySelectorAll('[data-nav]').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-nav')); });
  });
  document.querySelectorAll('[data-env]').forEach(function (b) {
    b.addEventListener('click', function () { setEnvironment(b.getAttribute('data-env')); });
  });
  document.querySelectorAll('[data-guide]').forEach(function (b) {
    b.addEventListener('click', function () { $('guide-indicator').value = b.getAttribute('data-guide'); show('guidance'); });
  });
  $('emergency-fab').addEventListener('click', function () { Tri.resetTriage(); show('triage'); });
  $('triage-restart').addEventListener('click', function () { Tri.resetTriage(); renderTriage(); });
  $('chart-indicator').addEventListener('change', renderDetailChart);
  $('charts-astronaut').addEventListener('change', function () { state.astronautId = $('charts-astronaut').value; renderChartsScreen(); });
  $('guide-indicator').addEventListener('change', renderGuidance);
  $('earth-flip').addEventListener('click', function () {
    state.earthMode = !state.earthMode;
    $('earth-banner').hidden = !state.earthMode;
    $('earth-flip').textContent = 'Earth remote-clinic mode: ' + (state.earthMode ? 'on' : 'off');
  });

  $('checkin-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var reading = {
      astronautId: $('ci-astronaut').value, date: $('ci-date').value || '2026-11-14',
      bpSys: num('ci-bpSys'), bpDia: num('ci-bpDia'), heartRate: num('ci-heartRate'),
      bloodSugar: num('ci-bloodSugar'), temp: num('ci-temp'), sleepHours: num('ci-sleepHours'), mood: num('ci-mood'),
      radiationMsvCumulative: null, eyeChangeUm: null
    };
    function num(id) { var v = $(id).value; return v === '' ? null : Number(v); }
    var res = S.saveReading(reading);
    if (!res.ok) {
      $('checkin-errors').textContent = Object.keys(res.errors).map(function (k) { return res.errors[k]; }).join(' ');
      $('checkin-result').textContent = '';
      return;
    }
    $('checkin-errors').textContent = '';
    var a = astronaut(reading.astronautId);
    var rs = readingsFor(a.id);
    var overall = T.overallStatus(a, rs);
    var msg = el('p'); msg.appendChild(document.createTextNode('Saved on this device. New status for ' + a.name + ': ')); msg.appendChild(statusHtml(overall.level, '→'));
    var result = $('checkin-result'); result.innerHTML = ''; result.appendChild(msg);
    renderCrew();
  });

  $('message-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var text = $('msg-text').value.trim();
    if (!text) return;
    Q.queueMessage(text, $('msg-astronaut').value || null, state.environment);
    $('msg-text').value = '';
    renderOutbox();
  });

  $('reset-demo').addEventListener('click', function () {
    S.resetDemo();
    $('reset-result').textContent = 'Demo reset — your entries are gone, simulated data is back.';
    renderCrew();
  });

  // Offline note
  function updateOnline() {
    $('offline-note').textContent = navigator.onLine ? 'Online — but everything still works with Wi-Fi off after the first load.' : 'Offline — saving on this device. Everything works with Wi-Fi off after the first load.';
  }
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);

  // Service worker (PWA) — registers only when served over http(s), not file://
  if ('serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  }

  // Outbox countdown, every second
  setInterval(function () { if (state.screen === 'messages') renderOutbox(); else Q.tick(); }, 1000);

  fillAstronautSelects();
  setEnvironment('Mars');
  updateOnline();
  show('crew');
})();
