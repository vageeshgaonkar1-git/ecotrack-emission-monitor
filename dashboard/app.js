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
    plugins: { legend: { labels: { color: '#8b949e' } } },
    scales: {
      x: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
      y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } }
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

// ── Update Live Cards ─────────────────────

async function updateLive() {
  try {
    const res  = await fetch('/api/live');
    const data = await res.json();
    if (!data || !data.co_ppm) return;

    // Cards
    document.getElementById('co-value').innerHTML
      = `${data.co_ppm.toFixed(1)} <span>PPM</span>`;
    document.getElementById('aqi-value').innerHTML
      = `${data.aqi.toFixed(1)} <span>AQI</span>`;
    document.getElementById('hc-value').innerHTML
      = `${data.hc_ppm.toFixed(1)} <span>PPM</span>`;
    document.getElementById('temp-value').innerHTML
      = `${data.temperature.toFixed(1)} <span>°C</span>`;
    document.getElementById('humidity-value').textContent
      = `${data.humidity.toFixed(1)}%`;

    // Card badges
    document.getElementById('co-status').textContent
      = data.co_status;
    document.getElementById('co-status').className
      = `card-badge ${getPucClass(data.co_status)}`;

    document.getElementById('hc-status').textContent
      = data.hc_status;
    document.getElementById('hc-status').className
      = `card-badge ${getPucClass(data.hc_status)}`;

    const aqiStatus = data.aqi < 150 ? 'PASS' : 'FAIL';
    document.getElementById('aqi-status').textContent = aqiStatus;
    document.getElementById('aqi-status').className
      = `card-badge ${getPucClass(aqiStatus)}`;

    // Status bar
    const bar = document.getElementById('emission-status-bar');
    bar.className = `status-bar ${getStatusClass(data.emission_status)}`;
    document.getElementById('emission-label').textContent
      = `${data.emission_status === 'SAFE' ? '✅' :
           data.emission_status === 'WARNING' ? '⚠️' : '🔴'}
         Emission Status: ${data.emission_status}`;
    document.getElementById('grade-badge').textContent
      = `Grade: ${data.overall_grade}`;

    // Vehicle status
    const vs = document.getElementById('vehicle-status');
    vs.textContent
      = data.vehicle_status === 'RUNNING' ? '● VEHICLE RUNNING' : '● VEHICLE OFF';
    vs.className
      = `badge ${data.vehicle_status === 'RUNNING' ? 'badge-safe' : 'badge-warn'}`;

    // PUC Table
    document.getElementById('puc-co').textContent
      = `${data.co_ppm.toFixed(1)} PPM`;
    document.getElementById('puc-hc').textContent
      = `${data.hc_ppm.toFixed(1)} PPM`;
    document.getElementById('puc-aqi').textContent
      = data.aqi.toFixed(1);
    document.getElementById('puc-co-status').innerHTML
      = `<span class="${getPucClass(data.co_status)}">${data.co_status}</span>`;
    document.getElementById('puc-hc-status').innerHTML
      = `<span class="${getPucClass(data.hc_status)}">${data.hc_status}</span>`;
    document.getElementById('puc-aqi-status').innerHTML
      = `<span class="${getPucClass(aqiStatus)}">${aqiStatus}</span>`;

    // Timestamp
    document.getElementById('last-updated').textContent
      = `Last updated: ${formatTime(data.timestamp)}`;

  } catch (err) {
    console.error('Live update error:', err);
  }
}

// ── Update Graph ──────────────────────────

async function updateChart() {
  try {
    const res      = await fetch('/api/history?hours=1');
    const readings = await res.json();
    if (!readings.length) return;

    chart.data.labels = readings.map(r => formatTime(r.timestamp));
    chart.data.datasets[0].data = readings.map(r => r.co_ppm);
    chart.data.datasets[1].data = readings.map(r => r.aqi);
    chart.data.datasets[2].data = readings.map(r => r.hc_ppm);
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

    if (!stats.length) {
      tbody.innerHTML = '<tr><td colspan="6">No history yet</td></tr>';
      return;
    }

    tbody.innerHTML = stats.map(s => `
      <tr>
        <td>${s.date}</td>
        <td>${s.avg_co}</td>
        <td>${s.avg_aqi}</td>
        <td>${s.avg_hc}</td>
        <td><span class="badge badge-safe">${s.overall_grade}</span></td>
        <td>${s.total_readings}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('History update error:', err);
  }
}

// ── Auto Refresh ──────────────────────────

updateLive();
updateChart();
updateHistory();

// Live cards refresh every 5 seconds
setInterval(updateLive, 5000);

// Graph + history refresh every 30 seconds
setInterval(updateChart,  30000);
setInterval(updateHistory, 30000);