  const $ = (id) => document.getElementById(id);
  const out = $('output');

  function getCommon() {
    const lat = Number($('lat').value);
    const lon = Number($('lon').value);
    const unit = $('unit').value;
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      throw new Error('Enter valid latitude and longitude.');
    }
    return { lat, lon, unit };
  }

  async function run(url) {
    out.textContent = 'Loading…';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      out.textContent = JSON.stringify(data, null, 2); // replace with your rendering later
    } catch (e) {
      out.textContent = `Error: ${e.message}`;
    }
  }

  // Forecast button (3 days)
  document.getElementById('btn-fc').addEventListener('click', async () => {
  const out = document.getElementById('output');
  const lat = Number(document.getElementById('lat').value);
  const lon = Number(document.getElementById('lon').value);
  const unit = document.getElementById('unit').value;

  const days = 3;
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
    `&forecast_days=${days}&timezone=auto&temperature_unit=${unit}`;

  out.textContent = 'Loading…';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderForecast(data);
    out.textContent = '';
  } catch (e) {
    out.textContent = `Error: ${e.message}`;
  }
});

  // Historical button (default: yesterday → today, hourly temp & dewpoint)
document.getElementById('btn-hs').addEventListener('click', async () => {
  const out = document.getElementById('output');
  const lat = Number(document.getElementById('lat').value);
  const lon = Number(document.getElementById('lon').value);
  const unit = document.getElementById('unit').value;

  // defaults: yesterday → today; temperature + dew point (hourly)
  const today = new Date();
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const fmt = d => d.toISOString().slice(0,10);

  const vars = ['temperature_2m','dew_point_2m'];
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=${vars.join(',')}` +
    `&start_date=${fmt(yest)}&end_date=${fmt(today)}` +
    `&timezone=auto&temperature_unit=${unit}`;

  out.textContent = 'Loading…';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const series = toSeries(data, vars);
    drawChart(series);
    out.textContent = '';
  } catch (e) {
    out.textContent = `Error: ${e.message}`;
  }
});

  function wmoIcon(code) {
  if ([0].includes(code)) return "sunny.svg";                       // clear
  if ([1,2].includes(code)) return "partly-cloudy.svg";             // mostly clear
  if ([3].includes(code)) return "overcast.svg";                    // overcast
  if ([45,48].includes(code)) return "🌫️";                          // fog
  if ([51,53,55,56,57].includes(code)) return "rain.svg";           // drizzle
  if ([61,63,65,66,67].includes(code)) return "rain.svg";           // rain
  if ([71,73,75,77,85,86].includes(code)) return "snow.svg";        // snow
  if ([95,96,99].includes(code)) return "thunder-storms.svg";       // thunder
  return "🌡️";
  }

  function renderForecast(data) {
  const c = document.getElementById('forecast-cards');
  c.innerHTML = '';

  const t    = data?.daily?.time || [];
  const tmax = data?.daily?.temperature_2m_max || [];
  const tmin = data?.daily?.temperature_2m_min || [];
  const wmo  = data?.daily?.weather_code || [];

  for (let i = 0; i < t.length; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    const date = new Date(t[i]).toLocaleDateString();

    const iconFile = wmoIcon(Number(wmo[i]));
    const iconHtml = String(iconFile).endsWith('.svg')
      ? `<img src="icons/${iconFile}" alt="weather icon" width="48" height="48">`
      : `<span aria-label="weather">${iconFile}</span>`; // fallback if your map returns an emoji for some codes

    card.innerHTML = `
      <div class="date">${date}</div>
      <div class="icon">${iconHtml}</div>
      <div class="temps">
        <span class="high">H: ${Math.round(tmax[i])}°</span>
        <span class="low">L: ${Math.round(tmin[i])}°</span>
      </div>
    `;
    c.appendChild(card);
  }
}

function renderForecast(data) {
  const c = document.getElementById('forecast-cards');
  c.innerHTML = '';

  const t    = data?.daily?.time || [];
  const tmax = data?.daily?.temperature_2m_max || [];
  const tmin = data?.daily?.temperature_2m_min || [];
  const wmo  = data?.daily?.weather_code || [];

  for (let i = 0; i < t.length; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    const date = new Date(t[i]).toLocaleDateString();

    const iconFile = wmoIcon(Number(wmo[i]));
    const iconHtml = String(iconFile).endsWith('.svg')
      ? `<img src="icons/${iconFile}" alt="weather icon" width="48" height="48">`
      : `<span aria-label="weather">${iconFile}</span>`; // fallback if your map returns an emoji for some codes

    card.innerHTML = `
      <div class="date">${date}</div>
      <div class="icon">${iconHtml}</div>
      <div class="temps">
        <span class="high">H: ${Math.round(tmax[i])}°</span>
        <span class="low">L: ${Math.round(tmin[i])}°</span>
      </div>
    `;
    c.appendChild(card);
  }
}

function toSeries(archiveJson, varNames) {
  const time = archiveJson?.hourly?.time || [];
  const series = [];

  varNames.forEach(name => {
    const arr = archiveJson?.hourly?.[name] || [];
    const points = time.map((t, i) => ({
      time: new Date(t),
      value: arr[i],
      name
    })).filter(p => p.value != null);
    if (points.length) series.push(points);
  });

  return series;
}

function drawChart(seriesArr) {
  const mount = document.getElementById('chart');
  mount.innerHTML = '';

  if (!seriesArr.length || !seriesArr[0]?.length) {
    mount.textContent = 'No data to plot.';
    return;
  }

  const margin = {top: 24, right: 24, bottom: 36, left: 48};
  const width  = Math.min(mount.clientWidth || 720, 900);
  const height = 360;

  const svg = d3.select(mount).append('svg')
    .attr('width',  width)
    .attr('height', height);

  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const flat = seriesArr.flat();
  const x = d3.scaleTime()
    .domain(d3.extent(flat, d => d.time))
    .range([0, innerW]);
  const y = d3.scaleLinear()
    .domain(d3.extent(flat, d => d.value)).nice()
    .range([innerH, 0]);

  g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6));
  g.append('g').call(d3.axisLeft(y).ticks(6));

  const line = d3.line().x(d => x(d.time)).y(d => y(d.value));

  seriesArr.forEach(points => {
    g.append('path')
      .datum(points)
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-width', 1.6)
      .attr('d', line);
  });

  const names = [...new Set(seriesArr.map(s => s[0]?.name).filter(Boolean))];
  g.append('text').attr('x', 0).attr('y', -6).text(names.join(' • ')).attr('font-size', 12);
}