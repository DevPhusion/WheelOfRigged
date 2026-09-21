(function () {
  'use strict';

  /* ---------------------------------------------------------------
   * Storage
   * ------------------------------------------------------------- */
  var LS_NAMES = 'won_names_v1';
  var LS_SETTINGS = 'won_settings_v1';

  var DEFAULT_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Priya', 'Chen'];
  var DEFAULT_SETTINGS = {
    spinDuration: 6,
    sound: true,
    confetti: true,
    rigEnabled: false,
    rigNames: []
  };

  function loadNames() {
    try {
      var raw = localStorage.getItem(LS_NAMES);
      if (!raw) return DEFAULT_NAMES.slice();
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_NAMES.slice();
    } catch (e) {
      return DEFAULT_NAMES.slice();
    }
  }
  function saveNames(list) {
    try { localStorage.setItem(LS_NAMES, JSON.stringify(list)); } catch (e) {}
  }
  function loadSettings() {
    try {
      var raw = localStorage.getItem(LS_SETTINGS);
      var parsed = raw ? JSON.parse(raw) : {};
      var out = {};
      for (var k in DEFAULT_SETTINGS) out[k] = (k in parsed) ? parsed[k] : DEFAULT_SETTINGS[k];
      return out;
    } catch (e) {
      var copy = {};
      for (var k2 in DEFAULT_SETTINGS) copy[k2] = DEFAULT_SETTINGS[k2];
      return copy;
    }
  }
  function saveSettings(s) {
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch (e) {}
  }

  var names = loadNames();
  var settings = loadSettings();

  /* ---------------------------------------------------------------
   * DOM references
   * ------------------------------------------------------------- */
  var canvas = document.getElementById('wheelCanvas');
  var ctx = canvas.getContext('2d');
  var spinBtn = document.getElementById('spinBtn');
  var namesListEl = document.getElementById('namesList');
  var nameInput = document.getElementById('nameInput');
  var addNameForm = document.getElementById('addNameForm');
  var bulkNames = document.getElementById('bulkNames');
  var bulkAddBtn = document.getElementById('bulkAddBtn');
  var clearNamesBtn = document.getElementById('clearNamesBtn');

  var winnerModal = document.getElementById('winnerModal');
  var winnerNameEl = document.getElementById('winnerName');
  var closeWinnerBtn = document.getElementById('closeWinnerBtn');

  var advancedPanel = document.getElementById('advancedPanel');
  var spinDurationInput = document.getElementById('spinDuration');
  var soundToggle = document.getElementById('soundToggle');
  var confettiToggle = document.getElementById('confettiToggle');
  var rigToggle = document.getElementById('rigToggle');
  var rigNamesInput = document.getElementById('rigNames');
  var saveAdvancedBtn = document.getElementById('saveAdvancedBtn');
  var closeAdvancedBtn = document.getElementById('closeAdvancedBtn');
  var siteTitle = document.getElementById('siteTitle');

  var confettiCanvas = document.getElementById('confettiCanvas');

  var PALETTE = ['#F2A93B', '#F4623A', '#4FA6A0', '#8E5572', '#E8C547', '#3D7068', '#D9695F', '#6B4E71'];

  var rotation = 0;   // current wheel rotation, radians
  var spinning = false;

  /* ---------------------------------------------------------------
   * Canvas sizing (crisp on retina / mobile)
   * ------------------------------------------------------------- */
  function resizeCanvas() {
    var wrap = canvas.parentElement;
    var size = Math.min(wrap.clientWidth, 520);
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWheel();
  }
  window.addEventListener('resize', resizeCanvas);

  /* ---------------------------------------------------------------
   * Wheel drawing
   * ------------------------------------------------------------- */
  function drawWheel() {
    var W = canvas.clientWidth || 520;
    var H = canvas.clientHeight || 520;
    var cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 8;

    ctx.clearRect(0, 0, W, H);

    if (names.length === 0) {
      ctx.save();
      ctx.fillStyle = '#163F3C';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9FC2BC';
      ctx.font = '600 18px "Work Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add names to begin', cx, cy);
      ctx.restore();
      return;
    }

    var n = names.length;
    var slice = (Math.PI * 2) / n;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    for (var i = 0; i < n; i++) {
      var start = i * slice;
      var end = start + slice;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();

      ctx.save();
      ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FBF3E7';
      ctx.font = '600 15px "Work Sans", sans-serif';
      var label = names[i].length > 16 ? names[i].slice(0, 15) + '…' : names[i];
      ctx.fillText(label, r - 18, 0);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#FBF3E7';
    ctx.fill();
    ctx.restore();
  }

  /* ---------------------------------------------------------------
   * Winner selection
   *
   * settings.rigNames  -> list of names typed into the hidden panel
   * settings.rigEnabled -> state of the disguised "advanced randomization
   *                         engine" checkbox
   *
   * If rigNames is empty, selection is always a plain uniform draw.
   * If rigNames is non-empty:
   *   - rigEnabled = true  -> winner is drawn ONLY from names that match
   *                           the rig list (100% of those names, 0% of
   *                           anyone else), as long as at least one match
   *                           is currently on the wheel.
   *   - rigEnabled = false -> names on the rig list are excluded from the
   *                           draw entirely (0% chance), as long as that
   *                           doesn't remove every name from the wheel.
   * ------------------------------------------------------------- */
  function pickWinnerIndex() {
    var rigSet = {};
    var rigCount = 0;
    (settings.rigNames || []).forEach(function (n) {
      var key = n.trim().toLowerCase();
      if (key && !rigSet[key]) { rigSet[key] = true; rigCount++; }
    });

    var pool = names.map(function (_, i) { return i; });

    if (rigCount > 0) {
      if (settings.rigEnabled) {
        var onlyRig = pool.filter(function (i) { return rigSet[names[i].trim().toLowerCase()]; });
        if (onlyRig.length) pool = onlyRig;
      } else {
        var excludeRig = pool.filter(function (i) { return !rigSet[names[i].trim().toLowerCase()]; });
        if (excludeRig.length) pool = excludeRig;
      }
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------------------------------------------------------------
   * Spin animation
   * ------------------------------------------------------------- */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function spin() {
    if (spinning || names.length === 0) return;
    spinning = true;
    spinBtn.disabled = true;

    var winnerIdx = pickWinnerIndex();
    var n = names.length;
    var slice = (Math.PI * 2) / n;
    var pointerAngle = -Math.PI / 2; // pointer is fixed at the top
    var winnerCenter = winnerIdx * slice + slice / 2;

    var targetMod = (((pointerAngle - winnerCenter) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var currentMod = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var delta = targetMod - currentMod;
    if (delta < 0) delta += Math.PI * 2;

    var extraSpins = 6 + Math.floor(Math.random() * 3);
    var totalRotation = delta + extraSpins * Math.PI * 2;

    var duration = Math.max(2, Math.min(15, Number(settings.spinDuration) || 6)) * 1000;
    var startRotation = rotation;
    var startTime = null;
    var lastTickSlice = -1;

    function frame(now) {
      if (startTime === null) startTime = now;
      var elapsed = now - startTime;
      var t = Math.min(1, elapsed / duration);
      var eased = easeOutCubic(t);
      rotation = startRotation + totalRotation * eased;
      drawWheel();

      if (settings.sound) {
        var normalized = (((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
        var currentSlice = Math.floor(normalized / slice);
        if (currentSlice !== lastTickSlice) {
          lastTickSlice = currentSlice;
          playTick();
        }
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation = startRotation + totalRotation;
        drawWheel();
        spinning = false;
        spinBtn.disabled = false;
        announceWinner(names[winnerIdx]);
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------
   * Sound (Web Audio API — no audio files needed)
   * ------------------------------------------------------------- */
  var audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }
  function playTick() {
    var ac = getAudioCtx();
    if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.value = 900;
      gain.gain.value = 0.05;
      osc.connect(gain); gain.connect(ac.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.05);
      osc.stop(ac.currentTime + 0.06);
    } catch (e) {}
  }
  function playChime() {
    var ac = getAudioCtx();
    if (!ac) return;
    try {
      [523.25, 659.25, 783.99].forEach(function (freq, i) {
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.0001;
        osc.connect(gain); gain.connect(ac.destination);
        var t0 = ac.currentTime + i * 0.08;
        osc.start(t0);
        gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        osc.stop(t0 + 0.55);
      });
    } catch (e) {}
  }

  /* ---------------------------------------------------------------
   * Confetti (lightweight, self-contained — no external library)
   * ------------------------------------------------------------- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function launchConfetti() {
    if (reduceMotion) return;
    var cctx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    var pieces = [];
    for (var i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * 200,
        r: 4 + Math.random() * 5,
        c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        vy: 2 + Math.random() * 3,
        vx: -2 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4
      });
    }

    var frames = 0;
    function step() {
      cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      pieces.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        cctx.save();
        cctx.translate(p.x, p.y);
        cctx.rotate(p.rot);
        cctx.fillStyle = p.c;
        cctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        cctx.restore();
      });
      frames++;
      if (frames < 150) {
        requestAnimationFrame(step);
      } else {
        cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }
    step();
  }

  /* ---------------------------------------------------------------
   * Winner modal
   * ------------------------------------------------------------- */
  function announceWinner(name) {
    winnerNameEl.textContent = name;
    winnerModal.classList.remove('hidden');
    if (settings.confetti) launchConfetti();
    if (settings.sound) playChime();
  }
  closeWinnerBtn.addEventListener('click', function () {
    winnerModal.classList.add('hidden');
  });

  /* ---------------------------------------------------------------
   * Name list UI
   * ------------------------------------------------------------- */
  function renderNamesList() {
    namesListEl.innerHTML = '';
    names.forEach(function (name, i) {
      var li = document.createElement('li');
      li.className = 'name-chip';

      var span = document.createElement('span');
      span.textContent = name;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'remove-btn';
      btn.setAttribute('aria-label', 'Remove ' + name);
      btn.textContent = '\u00D7';
      btn.addEventListener('click', function () {
        names.splice(i, 1);
        saveNames(names);
        renderNamesList();
      });

      li.appendChild(span);
      li.appendChild(btn);
      namesListEl.appendChild(li);
    });
    drawWheel();
  }

  addNameForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var val = nameInput.value.trim();
    if (!val) return;
    names.push(val);
    saveNames(names);
    nameInput.value = '';
    renderNamesList();
  });

  bulkAddBtn.addEventListener('click', function () {
    var lines = bulkNames.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) return;
    names = names.concat(lines);
    saveNames(names);
    bulkNames.value = '';
    renderNamesList();
  });

  clearNamesBtn.addEventListener('click', function () {
    if (!window.confirm('Remove all names?')) return;
    names = [];
    saveNames(names);
    renderNamesList();
  });

  spinBtn.addEventListener('click', spin);

  /* ---------------------------------------------------------------
   * Hidden "Advanced Options" panel
   *
   * There is no visible button for this anywhere in the page. It opens
   * only via:
   *   - 5 taps/clicks on the title within 2 seconds, or
   *   - the Ctrl+Alt+A keyboard shortcut
   * ------------------------------------------------------------- */
  function openAdvancedPanel() {
    spinDurationInput.value = settings.spinDuration;
    soundToggle.checked = !!settings.sound;
    confettiToggle.checked = !!settings.confetti;
    rigToggle.checked = !!settings.rigEnabled;
    rigNamesInput.value = (settings.rigNames || []).join('\n');
    advancedPanel.classList.remove('hidden');
  }
  function closeAdvancedPanel() {
    advancedPanel.classList.add('hidden');
  }

  saveAdvancedBtn.addEventListener('click', function () {
    settings.spinDuration = Math.max(2, Math.min(15, Number(spinDurationInput.value) || 6));
    settings.sound = soundToggle.checked;
    settings.confetti = confettiToggle.checked;
    settings.rigEnabled = rigToggle.checked;
    settings.rigNames = rigNamesInput.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    saveSettings(settings);
    closeAdvancedPanel();
  });
  closeAdvancedBtn.addEventListener('click', closeAdvancedPanel);

  var tapCount = 0;
  var tapTimer = null;
  siteTitle.addEventListener('click', function () {
    tapCount++;
    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(function () { tapCount = 0; }, 2000);
    if (tapCount >= 5) {
      tapCount = 0;
      openAdvancedPanel();
    }
  });

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.altKey && (e.key === 'a' || e.key === 'A')) {
      openAdvancedPanel();
    }
  });

  /* ---------------------------------------------------------------
   * Init
   * ------------------------------------------------------------- */
  renderNamesList();
  resizeCanvas();
})();
