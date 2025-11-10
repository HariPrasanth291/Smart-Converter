// script.js - Smart Converter Pro
document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const tools = document.querySelectorAll('.tool');
  const converters = document.querySelectorAll('.converter');
  tools.forEach(btn => {
    btn.addEventListener('click', () => {
      tools.forEach(t => t.classList.remove('active'));
      converters.forEach(c => { c.classList.remove('active'); c.hidden = true; });
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.target);
      if (target) { target.classList.add('active'); target.hidden = false; }
      // reset progress bar when switching
      const pb = document.getElementById('progress-bar');
      if (pb) pb.style.width = '0%';
    });
  });

  // Theme toggle with persistence
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  const saved = localStorage.getItem('sc_theme');
  if (saved === 'light') { body.classList.add('light'); themeToggle.checked = true; }
  themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) { body.classList.add('light'); localStorage.setItem('sc_theme','light'); }
    else { body.classList.remove('light'); localStorage.setItem('sc_theme','dark'); }
  });

  // Utility copy
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); document.body.removeChild(ta); return true; } catch { document.body.removeChild(ta); return false; }
    }
  }

  // FILE TRANSFER
  const fileConvert = document.getElementById('file-convert');
  const fileResult = document.getElementById('file-result');
  const progressBar = document.getElementById('progress-bar');
  let simTimer = null;

  fileConvert?.addEventListener('click', () => {
    // clear any running simulation
    if (simTimer) { clearInterval(simTimer); simTimer = null; }
    progressBar.style.width = '0%';
    fileResult.classList.remove('error');

    const fileSize = parseFloat(document.getElementById('file-size').value);
    const fileUnit = document.getElementById('file-size-unit').value;
    const speed = parseFloat(document.getElementById('transfer-speed').value);
    const speedUnit = document.getElementById('speed-unit').value;

    if (!isFinite(fileSize) || fileSize <= 0 || !isFinite(speed) || speed <= 0) {
      fileResult.textContent = 'Please enter positive numbers for size and speed.'; fileResult.classList.add('error'); return;
    }

    // convert size to MB
    let sizeMB = fileSize;
    if (fileUnit === 'GB') sizeMB = fileSize * 1024;
    if (fileUnit === 'TB') sizeMB = fileSize * 1024 * 1024;

    // speed MB/s
    let speedMBps = speedUnit === 'Mbps' ? speed / 8 : speed;

    const seconds = sizeMB / speedMBps;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hrs) parts.push(`${hrs} hr`);
    if (mins) parts.push(`${mins} min`);
    parts.push(`${secs} sec`);
    const formatted = parts.join(' ');

    // Show result
    fileResult.innerHTML = `<div>Estimated: <strong>${formatted}</strong></div><div class="small">File: ${fileSize} ${fileUnit} · Speed: ${speed} ${speedUnit}</div>`;

    // Simulate progress bar for UX: cap duration to 20s for simulation if actual > 20s
    const simDuration = Math.min(20, Math.max(1, seconds)); // seconds
    let elapsed = 0;
    const interval = 100; // ms
    const steps = simDuration * 1000 / interval;
    simTimer = setInterval(() => {
      elapsed += interval;
      const pct = Math.min(100, (elapsed / (simDuration*1000)) * 100);
      progressBar.style.width = pct + '%';
      if (pct >= 100) { clearInterval(simTimer); simTimer = null; }
    }, interval);
  });

  document.getElementById('file-copy')?.addEventListener('click', async () => {
    const ok = await copyText(fileResult.textContent || '');
    alert(ok ? 'Copied result to clipboard' : 'Copy failed');
  });

  // TIME ZONE converter
  const timeConvert = document.getElementById('time-convert');
  const timeResult = document.getElementById('time-result');

  function convertFromZoneToZone(year, month, day, hour, minute, fromZone, toZone) {
    // Create a UTC reference date at specified Y-M-D H:M
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    // Use toLocaleString to get wall-clock in fromZone
    const fromStr = utcDate.toLocaleString('en-GB', {
      timeZone: fromZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    const [datePart, timePart] = fromStr.split(', ');
    const [dd, mm, yyyy] = datePart.split('/');
    const [hh, min] = timePart.split(':');
    const interpreted = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), 0);
    const formattedTo = interpreted.toLocaleString([], { timeZone: toZone, hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric', hour12: false });
    return formattedTo;
  }

  timeConvert?.addEventListener('click', () => {
    timeResult.classList.remove('error');
    const val = document.getElementById('dt-input').value;
    const fromZone = document.getElementById('tz-from').value;
    const toZone = document.getElementById('tz-to').value;
    if (!val) { timeResult.textContent = 'Please choose a date and time.'; timeResult.classList.add('error'); return; }
    const [datePart, timePart] = val.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    try {
      const out = convertFromZoneToZone(y, m, d, hh, mm, fromZone, toZone);
      timeResult.innerHTML = `<div><strong>${out}</strong></div><div class="small">From: ${fromZone} → To: ${toZone}</div>`;
    } catch (e) {
      timeResult.textContent = 'Conversion error'; timeResult.classList.add('error'); console.error(e);
    }
  });

  document.getElementById('time-copy')?.addEventListener('click', async () => {
    const ok = await copyText(timeResult.textContent || '');
    alert(ok ? 'Copied' : 'Copy failed');
  });

  // DISTANCE
  document.getElementById('dist-convert')?.addEventListener('click', () => {
    const v = parseFloat(document.getElementById('dist-input').value);
    const from = document.getElementById('dist-from').value;
    const to = document.getElementById('dist-to').value;
    const el = document.getElementById('dist-result');
    if (!isFinite(v) || v < 0) { el.textContent = 'Enter valid number'; return; }
    let res = v;
    if (from === 'km' && to === 'mi') res = v * 0.621371;
    if (from === 'mi' && to === 'km') res = v / 0.621371;
    el.textContent = `${v} ${from} = ${res.toFixed(4)} ${to}`;
  });
  document.getElementById('dist-copy')?.addEventListener('click', async () => copyText(document.getElementById('dist-result').textContent || ''));

  // TEMPERATURE
  document.getElementById('temp-convert')?.addEventListener('click', () => {
    const v = parseFloat(document.getElementById('temp-input').value);
    const from = document.getElementById('temp-from').value;
    const to = document.getElementById('temp-to').value;
    const out = document.getElementById('temp-result');
    if (!isFinite(v)) { out.textContent = 'Enter valid number'; return; }
    let r = v;
    if (from === 'C' && to === 'F') r = (v * 9) / 5 + 32;
    if (from === 'F' && to === 'C') r = ((v - 32) * 5) / 9;
    if (from === 'C' && to === 'K') r = v + 273.15;
    if (from === 'K' && to === 'C') r = v - 273.15;
    if (from === 'F' && to === 'K') r = ((v - 32) * 5) / 9 + 273.15;
    if (from === 'K' && to === 'F') r = ((v - 273.15) * 9) / 5 + 32;
    out.textContent = `${v}°${from} = ${r.toFixed(2)}°${to}`;
  });
  document.getElementById('temp-copy')?.addEventListener('click', async () => copyText(document.getElementById('temp-result').textContent || ''));

  // WEIGHT
  document.getElementById('weight-convert')?.addEventListener('click', () => {
    const v = parseFloat(document.getElementById('weight-input').value);
    const from = document.getElementById('weight-from').value;
    const to = document.getElementById('weight-to').value;
    const out = document.getElementById('weight-result');
    if (!isFinite(v) || v < 0) { out.textContent = 'Enter valid weight'; return; }
    let r = v;
    if (from === 'kg' && to === 'lb') r = v * 2.20462;
    if (from === 'lb' && to === 'kg') r = v / 2.20462;
    out.textContent = `${v} ${from} = ${r.toFixed(4)} ${to}`;
  });
  document.getElementById('weight-copy')?.addEventListener('click', async () => copyText(document.getElementById('weight-result').textContent || ''));

  // LENGTH
  document.getElementById('length-convert')?.addEventListener('click', () => {
    const v = parseFloat(document.getElementById('length-input').value);
    const from = document.getElementById('length-from').value;
    const to = document.getElementById('length-to').value;
    const out = document.getElementById('length-result');
    if (!isFinite(v) || v < 0) { out.textContent = 'Enter valid length'; return; }
    let r = v;
    if (from === 'm' && to === 'ft') r = v * 3.28084;
    if (from === 'ft' && to === 'm') r = v / 3.28084;
    out.textContent = `${v} ${from} = ${r.toFixed(4)} ${to}`;
  });
  document.getElementById('length-copy')?.addEventListener('click', async () => copyText(document.getElementById('length-result').textContent || ''));

  // SPEED
  document.getElementById('speed-convert')?.addEventListener('click', () => {
    const v = parseFloat(document.getElementById('speed-input').value);
    const from = document.getElementById('speed-from').value;
    const to = document.getElementById('speed-to').value;
    const out = document.getElementById('speed-result');
    if (!isFinite(v) || v < 0) { out.textContent = 'Enter valid speed'; return; }
    let r = v;
    if (from === 'kmh' && to === 'mph') r = v * 0.621371;
    if (from === 'mph' && to === 'kmh') r = v / 0.621371;
    out.textContent = `${v} ${from} = ${r.toFixed(3)} ${to}`;
  });
  document.getElementById('speed-copy')?.addEventListener('click', async () => copyText(document.getElementById('speed-result').textContent || ''));
});
