// ── Chart Setup ──────────────────────────
const ctx = document.getElementById('emissionChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'CO (PPM)',
        data: [],
        borderColor: '#f85149',
        backgroundColor: 'rgba(248,81,73,0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'AQI',
        data: [],
        borderColor: '#d29922',
        backgroundColor: 'rgba(210,153,34,0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'HC (PPM)',
        data: [],
        borderColor: '#3fb950',
        backgroundColor: 'rgba(63,185,80,0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#8b949e' } }
    },
    scales: {
      x: {
        ticks: { color: '#8b949e', maxTicksLimit: 8 },
        grid: { color: '#21262d' }
      },
      y: {
        ticks: { color: '#8b949e' },
        grid: { color: '#21262d' }
      }
    }
  }
});

// ── Helpers ──────────────────────────────
function getStatusClass(status) {
  if (status === 'SAFE')    return 'badge-safe';
  if (status === 'WARNING') return 'badge-warn';
  if (status === 'DANGER')  return 'badge-danger';
  return 'badge-info';
}

function getPucClass(status) {
  return status === 'PASS' ? 'pass' : 'fail';
}

function formatTime(timestamp) {
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleTimeString();
}

function safeVal(val, decimals = 1) {
  if (val === undefined || val === null || isNaN(val))
    return '--';
  return parseFloat(val).toFixed(decimals);
}

// ── Update Live Cards ─────────────────────
async function updateLive() {
  try {
    const res  = await fetch('/api/live');
    const data = await res.json();
    if (!data || !data.co_ppm) return;

    // Main cards
    document.getElementById('co-value').innerHTML
      = `${safeVal(data.co_ppm)} <span>PPM</span>`;
    document.getElementById('aqi-value').innerHTML
      = `${safeVal(data.aqi)} <span>AQI</span>`;
    document.getElementById('hc-value').innerHTML
      = `${safeVal(data.hc_ppm)} <span>PPM</span>`;
    document.getElementById('temp-value').innerHTML
      = `${safeVal(data.temperature)} <span>°C</span>`;
    document.getElementById('humidity-value').textContent
      = `${safeVal(data.humidity)}%`;

    // Card badges
    const coS = data.co_status || 'PASS';
    document.getElementById('co-status').textContent  = coS;
    document.getElementById('co-status').className
      = `card-badge ${getPucClass(coS)}`;

    const hcS = data.hc_status || 'PASS';
    document.getElementById('hc-status').textContent  = hcS;
    document.getElementById('hc-status').className
      = `card-badge ${getPucClass(hcS)}`;

    const aqiS = data.aqi < 200 ? 'PASS' : 'FAIL';
    document.getElementById('aqi-status').textContent = aqiS;
    document.getElementById('aqi-status').className
      = `card-badge ${getPucClass(aqiS)}`;

    // Status bar
    const bar = document.getElementById('emission-status-bar');
    const es  = data.emission_status || 'SAFE';
    bar.className = `status-bar ${getStatusClass(es)}`;
    const icon = es === 'SAFE' ? '✅' :
                 es === 'WARNING' ? '⚠️' : '🔴';
    document.getElementById('emission-label').textContent
      = `${icon} Emission Status: ${es}`;
    document.getElementById('grade-badge').textContent
      = `Grade: ${data.overall_grade || 'A'}`;

    // Vehicle status
    const vs = document.getElementById('vehicle-status');
    const vst = data.vehicle_status || 'UNKNOWN';
    vs.textContent = vst === 'RUNNING'
      ? '● VEHICLE RUNNING' : '● VEHICLE OFF';
    vs.className = `badge ${
      vst === 'RUNNING' ? 'badge-safe' : 'badge-warn'
    }`;

    // PUC Table
    document.getElementById('puc-co').textContent
      = `${safeVal(data.co_ppm)} PPM`;
    document.getElementById('puc-hc').textContent
      = `${safeVal(data.hc_ppm)} PPM`;
    document.getElementById('puc-aqi').textContent
      = safeVal(data.aqi);
    document.getElementById('puc-co-status').innerHTML
      = `<span class="${getPucClass(coS)}">${coS}</span>`;
    document.getElementById('puc-hc-status').innerHTML
      = `<span class="${getPucClass(hcS)}">${hcS}</span>`;
    document.getElementById('puc-aqi-status').innerHTML
      = `<span class="${getPucClass(aqiS)}">${aqiS}</span>`;

    // Timestamp
    document.getElementById('last-updated').textContent
      = `Last updated: ${formatTime(data.timestamp)}`;

    // Additional parameters
    updateAdditional(data);

  } catch (err) {
    console.error('Live update error:', err);
  }
}

// ── Update Additional Parameters ─────────
function updateAdditional(data) {
  // CO2
  const co2El = document.getElementById('co2-value');
  if (co2El) co2El.innerHTML
    = `${data.co2_ppm || '--'} <span>PPM</span>`;

  // NH3
  const nh3El = document.getElementById('nh3-value');
  if (nh3El) nh3El.innerHTML
    = `${safeVal(data.nh3_ppm)} <span>PPM</span>`;

  // Engine Load
  const elEl = document.getElementById('engine-load');
  if (elEl) elEl.textContent = data.engine_load || '--';

  // Lambda
  const lamEl = document.getElementById('lambda-value');
  if (lamEl) lamEl.textContent = data.lambda || '--';

  // Lambda status badge
  const lsEl = document.getElementById('lambda-status');
  if (lsEl) {
    const ls = data.lambda_status || 'OPTIMAL';
    lsEl.textContent = ls;
    lsEl.className = `card-badge ${
      ls === 'OPTIMAL' ? 'badge-safe' :
      ls === 'RICH'    ? 'badge-warn' : 'badge-danger'
    }`;
  }

  // Heat Index
  const hiEl = document.getElementById('heat-index');
  if (hiEl) hiEl.innerHTML
    = `${safeVal(data.heat_index)} <span>°C</span>`;

  // Benzene
  const brEl = document.getElementById('benzene-risk');
  const bbEl = document.getElementById('benzene-badge');
  if (brEl && bbEl) {
    const br = data.benzene_risk || 'NORMAL';
    brEl.textContent = br;
    bbEl.textContent = br;
    bbEl.className = `card-badge ${
      br === 'NORMAL' ? 'badge-safe' : 'badge-danger'
    }`;
  }
}

// ── Update Graph ──────────────────────────
async function updateChart() {
  try {
    const res      = await fetch('/api/history?hours=1');
    const readings = await res.json();
    if (!readings || !readings.length) return;

    chart.data.labels
      = readings.map(r => formatTime(r.timestamp));
    chart.data.datasets[0].data
      = readings.map(r => parseFloat(r.co_ppm)  || 0);
    chart.data.datasets[1].data
      = readings.map(r => parseFloat(r.aqi)     || 0);
    chart.data.datasets[2].data
      = readings.map(r => parseFloat(r.hc_ppm)  || 0);
    chart.update();

  } catch (err) {
    console.error('Chart update error:', err);
  }
}

// ── Update History Table ──────────────────
async function updateHistory() {
  try {
    const res   = await fetch('/api/stats');
    const stats = await res.json();
    const tbody = document.getElementById('history-body');
    if (!tbody) return;

    if (!stats || !stats.length) {
      tbody.innerHTML
        = '<tr><td colspan="6">No history yet</td></tr>';
      return;
    }

    tbody.innerHTML = stats.map(s => `
      <tr>
        <td>${s.date}</td>
        <td>${s.avg_co}</td>
        <td>${s.avg_aqi}</td>
        <td>${s.avg_hc}</td>
        <td><span class="badge badge-safe">
          ${s.overall_grade || 'A'}
        </span></td>
        <td>${s.total_readings}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('History update error:', err);
  }
}

// ── Update Last 5 Readings ────────────────
async function updateRecent() {
  try {
    const res      = await fetch('/api/recent');
    const readings = await res.json();
    const tbody    = document.getElementById('recent-body');
    if (!tbody) return;

    if (!readings || !readings.length) {
      tbody.innerHTML
        = '<tr><td colspan="8">No readings yet</td></tr>';
      return;
    }

    tbody.innerHTML = readings.map(r => `
      <tr>
        <td>${formatTime(r.timestamp)}</td>
        <td>${safeVal(r.co_ppm)}</td>
        <td>${safeVal(r.aqi)}</td>
        <td>${safeVal(r.hc_ppm)}</td>
        <td>${safeVal(r.temperature)}</td>
        <td>${r.engine_load || '--'}</td>
        <td>
          <span class="badge ${getStatusClass(r.emission_status)}">
            ${r.emission_status || '--'}
          </span>
        </td>
        <td>
          <span class="badge badge-safe">
            ${r.overall_grade || 'A'}
          </span>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Recent update error:', err);
  }
}

// ── Reset All Data ────────────────────────
async function resetData() {
  if (!confirm('Reset all graph data? This cannot be undone.'))
    return;
  await fetch('/reset');
  chart.data.labels = [];
  chart.data.datasets.forEach(d => d.data = []);
  chart.update();
  updateRecent();
  updateHistory();
  alert('Data reset successfully!');
}

// ── Initialize + Auto Refresh ─────────────
updateLive();
updateChart();
updateHistory();
updateRecent();

setInterval(updateLive,    5000);   // every 5 sec
setInterval(updateChart,   15000);  // every 15 sec
setInterval(updateHistory, 30000);  // every 30 sec
setInterval(updateRecent,  15000);  // every 15 sec