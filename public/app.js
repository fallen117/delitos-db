// ─── CONFIG ──────────────────────────────────────────────────────────
const API = '';  // vacío → mismo host (Express sirve el frontend)

// ─── PALETAS Chart.js ────────────────────────────────────────────────
const ACCENT   = '#e05a2b';
const DIM_CLR  = '#3a7bd5';
const PALETTE  = ['#e05a2b','#3a7bd5','#34d399','#fbbf24','#a78bfa','#f472b6','#60a5fa','#fb923c','#4ade80','#e879f9'];
const GRID_CLR = 'rgba(37,43,59,0.7)';
const TEXT_CLR = '#7a82a0';

Chart.defaults.color = TEXT_CLR;
Chart.defaults.borderColor = GRID_CLR;
Chart.defaults.font.family = 'Inter';

// ─── CHARTS STORE ────────────────────────────────────────────────────
const charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ─── FETCH HELPER ────────────────────────────────────────────────────
async function fetchAPI(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── NAVIGATION ──────────────────────────────────────────────────────
const LABELS = {
  resumen: 'Resumen General',
  temporal: 'Análisis Temporal',
  geografico: 'Distribución Geográfica',
  demografico: 'Demografía',
  tablas: 'Tablas de Datos',
};

function activateSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById(id);
  if (sec) sec.classList.add('active');
  const lnk = document.querySelector(`.nav-link[data-section="${id}"]`);
  if (lnk) lnk.classList.add('active');
  document.getElementById('breadcrumbLabel').textContent = LABELS[id] || id;
  loadSection(id);
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const sec = link.dataset.section;
    activateSection(sec);
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
    }
  });
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar').classList.toggle('hidden');
});

// ─── SECTION LOADERS ─────────────────────────────────────────────────
const loaded = {};

async function loadSection(id) {
  if (loaded[id]) return;
  loaded[id] = true;
  try {
    switch (id) {
      case 'resumen':    await loadResumen(); break;
      case 'temporal':   await loadTemporal(); break;
      case 'geografico': await loadGeografico(); break;
      case 'demografico':await loadDemografico(); break;
      case 'tablas':     initExplorerOnce(); break;
    }
  } catch (err) {
    console.error(`Error cargando sección ${id}:`, err);
  }
}

// ─── RESUMEN ─────────────────────────────────────────────────────────
async function loadResumen() {
  const [resumen, anios, zonas, fechaRes] = await Promise.all([
    fetchAPI('/api/resumen'),
    fetchAPI('/api/delitos-por-anio'),
    fetchAPI('/api/delitos-por-zona'),
    fetchAPI('/api/dim-fecha-resumen'),
  ]);

  // KPIs
  document.getElementById('kpiTotal').textContent = Number(resumen.totalDelitos).toLocaleString('es-CO');
  document.getElementById('kpiUbicaciones').textContent = Number(resumen.totalUbicaciones).toLocaleString();
  document.getElementById('kpiFechas').textContent = Number(resumen.totalFechas).toLocaleString();
  document.getElementById('kpiSexos').textContent = resumen.totalSexos;

  // Cobertura temporal
  if (fechaRes.anios && fechaRes.anios.length) {
    const min = fechaRes.anios[0], max = fechaRes.anios[fechaRes.anios.length - 1];
    document.getElementById('infoCoberturaTemp').innerHTML =
      `Registros desde <strong>${min}</strong> hasta <strong>${max}</strong>, con granularidad diaria.`;
  }

  // Gráfico anual
  destroyChart('chartAnioResumen');
  charts['chartAnioResumen'] = new Chart(document.getElementById('chartAnioResumen'), {
    type: 'bar',
    data: {
      labels: anios.map(r => r.anio),
      datasets: [{
        label: 'Delitos',
        data: anios.map(r => r.total),
        backgroundColor: anios.map((_, i) => i === anios.length - 1 ? ACCENT : 'rgba(224,90,43,.3)'),
        borderColor: ACCENT,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: GRID_CLR }, ticks: { color: TEXT_CLR } },
                x: { grid: { display: false }, ticks: { color: TEXT_CLR } } }
    }
  });

  // Gráfico zona donut
  destroyChart('chartZonaResumen');
  charts['chartZonaResumen'] = new Chart(document.getElementById('chartZonaResumen'), {
    type: 'doughnut',
    data: {
      labels: zonas.map(r => r.zona),
      datasets: [{ data: zonas.map(r => r.total), backgroundColor: PALETTE, borderWidth: 2, borderColor: '#141720' }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }
    }
  });

  setStatus(true);
}

// ─── TEMPORAL ────────────────────────────────────────────────────────
async function loadTemporal() {
  const [anios, meses, diasSemana, fechaRes] = await Promise.all([
    fetchAPI('/api/delitos-por-anio'),
    fetchAPI('/api/delitos-por-mes'),
    fetchAPI('/api/delitos-por-dia-semana'),
    fetchAPI('/api/dim-fecha-resumen'),
  ]);

  // Línea anual
  destroyChart('chartAnio');
  charts['chartAnio'] = new Chart(document.getElementById('chartAnio'), {
    type: 'line',
    data: {
      labels: anios.map(r => r.anio),
      datasets: [{
        label: 'Delitos por año',
        data: anios.map(r => r.total),
        borderColor: ACCENT,
        backgroundColor: 'rgba(224,90,43,.08)',
        pointBackgroundColor: ACCENT,
        pointRadius: 5,
        fill: true,
        tension: 0.3,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: GRID_CLR }, ticks: { color: TEXT_CLR } },
                x: { grid: { display: false }, ticks: { color: TEXT_CLR } } }
    }
  });

  // Barras por mes
  destroyChart('chartMes');
  charts['chartMes'] = new Chart(document.getElementById('chartMes'), {
    type: 'bar',
    data: {
      labels: meses.map(r => r.nombre_mes || `Mes ${r.mes}`),
      datasets: [{
        label: 'Delitos',
        data: meses.map(r => r.total),
        backgroundColor: DIM_CLR + 'aa',
        borderColor: DIM_CLR,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: GRID_CLR }, ticks: { color: TEXT_CLR } },
                x: { grid: { display: false }, ticks: { color: TEXT_CLR, maxRotation: 45 } } }
    }
  });

  // Radar días de semana
  destroyChart('chartDiaSemana');
  charts['chartDiaSemana'] = new Chart(document.getElementById('chartDiaSemana'), {
    type: 'radar',
    data: {
      labels: diasSemana.map(r => r.nombre),
      datasets: [{
        label: 'Delitos',
        data: diasSemana.map(r => r.total),
        borderColor: '#34d399',
        backgroundColor: 'rgba(52,211,153,.12)',
        pointBackgroundColor: '#34d399',
        pointRadius: 4,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { r: { grid: { color: GRID_CLR }, ticks: { color: TEXT_CLR, backdropColor: 'transparent' },
                      pointLabels: { color: TEXT_CLR, font: { size: 11 } } } }
    }
  });

  // Dim resumen
  const cont = document.getElementById('dimFechaStats');
  if (fechaRes.anios) {
    cont.innerHTML = `
      <div class="dim-stat-item"><strong>${fechaRes.totalRegistros.toLocaleString()}</strong> fechas únicas</div>
      <div class="dim-stat-item">Años: <strong>${fechaRes.anios[0]} – ${fechaRes.anios[fechaRes.anios.length-1]}</strong></div>
      <div class="dim-stat-item">Años distintos: <strong>${fechaRes.anios.length}</strong></div>
      <div class="dim-stat-item">Meses catalogados: <strong>${fechaRes.meses.length}</strong></div>
    `;
  }
}

// ─── GEOGRÁFICO ──────────────────────────────────────────────────────
let currentPage = 1;
const PAGE_SIZE = 20;
let totalRows = 0;

async function loadGeografico() {
  const [deptos, munis, zonas] = await Promise.all([
    fetchAPI('/api/top-departamentos?limit=15'),
    fetchAPI('/api/top-municipios?limit=10'),
    fetchAPI('/api/delitos-por-zona'),
  ]);

  // Barras horizontales departamentos
  destroyChart('chartDepartamentos');
  charts['chartDepartamentos'] = new Chart(document.getElementById('chartDepartamentos'), {
    type: 'bar',
    data: {
      labels: deptos.map(r => r.departamento),
      datasets: [{
        label: 'Delitos',
        data: deptos.map(r => r.total),
        backgroundColor: deptos.map((_, i) => i === 0 ? ACCENT : 'rgba(224,90,43,.3)'),
        borderColor: ACCENT,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, grid: { color: GRID_CLR }, ticks: { color: TEXT_CLR } },
                y: { grid: { display: false }, ticks: { color: TEXT_CLR, font: { size: 11 } } } }
    }
  });

  // Barras municipios
  destroyChart('chartMunicipios');
  charts['chartMunicipios'] = new Chart(document.getElementById('chartMunicipios'), {
    type: 'bar',
    data: {
      labels: munis.map(r => r.municipio.split(' (')[0]),
      datasets: [{
        label: 'Delitos',
        data: munis.map(r => r.total),
        backgroundColor: DIM_CLR + '99',
        borderColor: DIM_CLR,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: GRID_CLR }, ticks: { color: TEXT_CLR } },
                x: { grid: { display: false }, ticks: { color: TEXT_CLR, maxRotation: 45, font: { size: 10 } } } }
    }
  });

  // Dona zona
  destroyChart('chartZona');
  charts['chartZona'] = new Chart(document.getElementById('chartZona'), {
    type: 'doughnut',
    data: {
      labels: zonas.map(r => r.zona),
      datasets: [{ data: zonas.map(r => r.total), backgroundColor: PALETTE, borderWidth: 2, borderColor: '#141720' }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
    }
  });

  // Tabla paginada
  await loadTablaUbicacion(1);

  document.getElementById('prevPage').addEventListener('click', async () => {
    if (currentPage > 1) await loadTablaUbicacion(currentPage - 1);
  });
  document.getElementById('nextPage').addEventListener('click', async () => {
    const maxPage = Math.ceil(totalRows / PAGE_SIZE);
    if (currentPage < maxPage) await loadTablaUbicacion(currentPage + 1);
  });
}

async function loadTablaUbicacion(page) {
  currentPage = page;
  const tbody = document.getElementById('tablaUbicacionBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-cell"><div class="loader-inline"></div></td></tr>';
  const data = await fetchAPI(`/api/dim-ubicacion?page=${page}&limit=${PAGE_SIZE}`);
  totalRows = data.total;
  document.getElementById('pageInfo').textContent = `Pág. ${page} / ${Math.ceil(totalRows / PAGE_SIZE)}`;
  tbody.innerHTML = data.data.map(r => `
    <tr>
      <td>${r.ubicacion_id}</td>
      <td>${r.cod_depto ?? '—'}</td>
      <td>${r.departamento ?? '—'}</td>
      <td>${r.cod_muni ?? '—'}</td>
      <td>${r.municipio ?? '—'}</td>
      <td>${r.zona ?? '—'}</td>
    </tr>
  `).join('');
}

// ─── DEMOGRAFÍA ──────────────────────────────────────────────────────
async function loadDemografico() {
  const [sexoData, dimSexo] = await Promise.all([
    fetchAPI('/api/delitos-por-sexo'),
    fetchAPI('/api/dim-sexo'),
  ]);

  const total = sexoData.reduce((s, r) => s + r.total, 0);

  // Pastel
  destroyChart('chartSexoPie');
  charts['chartSexoPie'] = new Chart(document.getElementById('chartSexoPie'), {
    type: 'pie',
    data: {
      labels: sexoData.map(r => r.sexo),
      datasets: [{ data: sexoData.map(r => r.total), backgroundColor: PALETTE, borderWidth: 2, borderColor: '#141720' }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
    }
  });

  // Barras
  destroyChart('chartSexoBar');
  charts['chartSexoBar'] = new Chart(document.getElementById('chartSexoBar'), {
    type: 'bar',
    data: {
      labels: sexoData.map(r => r.sexo),
      datasets: [{
        label: 'Delitos',
        data: sexoData.map(r => r.total),
        backgroundColor: PALETTE,
        borderWidth: 0,
        borderRadius: 6,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: GRID_CLR }, ticks: { color: TEXT_CLR } },
                x: { grid: { display: false }, ticks: { color: TEXT_CLR } } }
    }
  });

  // Tabla sexo
  const map = {};
  sexoData.forEach(r => { map[r.sexo] = r.total; });

  const tbody = document.getElementById('tablaSexoBody');
  tbody.innerHTML = dimSexo.map(r => {
    const t = map[r.sexo] || 0;
    const pct = total > 0 ? ((t / total) * 100).toFixed(1) : '0.0';
    return `<tr>
      <td>${r.sexo_id}</td>
      <td>${r.sexo ?? '—'}</td>
      <td>${t.toLocaleString('es-CO')}</td>
      <td><span style="color:var(--accent2)">${pct}%</span></td>
    </tr>`;
  }).join('');
}

// ─── STATUS ──────────────────────────────────────────────────────────
function setStatus(ok) {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  dot.className  = 'status-dot ' + (ok ? 'ok' : 'error');
  text.textContent = ok ? 'Conectado · Supabase' : 'Error de conexión';
}

// ─── EXPLORADOR DE REGISTROS ──────────────────────────────────────────
// Config por tabla: endpoint, columnas a mostrar (orden) y si soporta búsqueda en backend.
const EXPLORER_TABLES = {
  'fact-delitos': {
    endpoint: '/api/explorar/fact-delitos',
    columns: ['fecha_id', 'ubicacion_id', 'sexo_id', 'cantidad'],
    searchable: false,
  },
  'dim-fecha': {
    endpoint: '/api/explorar/dim-fecha',
    columns: ['fecha_id', 'fecha_hecho', 'anio', 'mes', 'dia', 'dia_semana', 'nombre_mes'],
    searchable: true,
  },
  'dim-ubicacion': {
    endpoint: '/api/explorar/dim-ubicacion',
    columns: ['ubicacion_id', 'cod_depto', 'departamento', 'cod_muni', 'municipio', 'zona'],
    searchable: true,
  },
  'dim-sexo': {
    endpoint: '/api/explorar/dim-sexo',
    columns: ['sexo_id', 'sexo'],
    searchable: false,
  },
};

const explorerState = {
  table: 'fact-delitos',
  page: 1,
  limit: 50,
  search: '',
  total: 0,
  pages: 1,
};

let explorerSearchDebounce = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') {
    return '<span class="cell-null">—</span>';
  }
  return escapeHtml(value);
}

async function loadExplorerTable() {
  const cfg = EXPLORER_TABLES[explorerState.table];
  const tbody = document.getElementById('explorerTbody');
  const thead = document.getElementById('explorerThead');
  const status = document.getElementById('explorerStatus');
  const countEl = document.getElementById('explorerCount');

  status.textContent = 'Cargando…';
  tbody.innerHTML = `<tr><td colspan="${cfg.columns.length}" class="loading-cell"><div class="loader-inline"></div></td></tr>`;

  // Encabezados
  thead.innerHTML = `<tr>${cfg.columns.map(c => `<th>${c}</th>`).join('')}</tr>`;

  try {
    let url = `${cfg.endpoint}?page=${explorerState.page}&limit=${explorerState.limit}`;
    if (cfg.searchable && explorerState.search) {
      url += `&search=${encodeURIComponent(explorerState.search)}`;
    }
    const res = await fetchAPI(url);
    let rows = res.data || [];

    // dim_sexo no pagina en backend (devuelve todo) y no busca: filtramos/paginamos en cliente.
    if (explorerState.table === 'dim-sexo') {
      if (explorerState.search) {
        const q = explorerState.search.toLowerCase();
        rows = rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)));
      }
      explorerState.total = rows.length;
      explorerState.pages = Math.max(1, Math.ceil(rows.length / explorerState.limit));
      const from = (explorerState.page - 1) * explorerState.limit;
      rows = rows.slice(from, from + explorerState.limit);
    } else {
      explorerState.total = res.total ?? rows.length;
      explorerState.pages = res.pages ?? 1;
    }

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${cfg.columns.length}" class="loading-cell">Sin resultados.</td></tr>`;
    } else {
      tbody.innerHTML = rows.map(r => `
        <tr>${cfg.columns.map(c => `<td>${formatCell(r[c])}</td>`).join('')}</tr>
      `).join('');
    }

    countEl.textContent = `${explorerState.total.toLocaleString('es-CO')} registros totales`;
    document.getElementById('explorerPageInfo').textContent = `Pág. ${explorerState.page} / ${explorerState.pages}`;
    status.textContent = '';

    // Botones de paginación
    document.getElementById('explorerFirst').disabled = explorerState.page <= 1;
    document.getElementById('explorerPrev').disabled  = explorerState.page <= 1;
    document.getElementById('explorerNext').disabled  = explorerState.page >= explorerState.pages;
    document.getElementById('explorerLast').disabled  = explorerState.page >= explorerState.pages;

  } catch (err) {
    console.error('Error cargando explorador:', err);
    tbody.innerHTML = `<tr><td colspan="${cfg.columns.length}" class="loading-cell">Error al cargar los datos.</td></tr>`;
    status.textContent = 'Error';
  }
}

function setupExplorer() {
  // Tabs de selección de tabla
  document.querySelectorAll('.explorer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.explorer-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      explorerState.table = tab.dataset.table;
      explorerState.page = 1;
      explorerState.search = '';
      document.getElementById('explorerSearch').value = '';
      const cfg = EXPLORER_TABLES[explorerState.table];
      document.getElementById('explorerSearch').disabled = !cfg.searchable && explorerState.table !== 'dim-sexo';
      document.getElementById('explorerSearch').placeholder = cfg.searchable || explorerState.table === 'dim-sexo'
        ? 'Buscar…'
        : 'Búsqueda no disponible para esta tabla';
      loadExplorerTable();
    });
  });

  // Buscador (con debounce)
  document.getElementById('explorerSearch').addEventListener('input', (e) => {
    clearTimeout(explorerSearchDebounce);
    explorerSearchDebounce = setTimeout(() => {
      explorerState.search = e.target.value.trim();
      explorerState.page = 1;
      loadExplorerTable();
    }, 350);
  });

  // Tamaño de página
  document.getElementById('explorerPageSize').addEventListener('change', (e) => {
    explorerState.limit = parseInt(e.target.value);
    explorerState.page = 1;
    loadExplorerTable();
  });

  // Paginación
  document.getElementById('explorerFirst').addEventListener('click', () => {
    if (explorerState.page > 1) { explorerState.page = 1; loadExplorerTable(); }
  });
  document.getElementById('explorerPrev').addEventListener('click', () => {
    if (explorerState.page > 1) { explorerState.page -= 1; loadExplorerTable(); }
  });
  document.getElementById('explorerNext').addEventListener('click', () => {
    if (explorerState.page < explorerState.pages) { explorerState.page += 1; loadExplorerTable(); }
  });
  document.getElementById('explorerLast').addEventListener('click', () => {
    if (explorerState.page < explorerState.pages) { explorerState.page = explorerState.pages; loadExplorerTable(); }
  });

  // Carga inicial (tabla por defecto: fact_delitos)
  loadExplorerTable();
}

let explorerInitialized = false;
function initExplorerOnce() {
  if (explorerInitialized) return;
  explorerInitialized = true;
  setupExplorer();
}

// ─── INIT ─────────────────────────────────────────────────────────────
(async () => {
  try {
    await loadSection('resumen');
  } catch (e) {
    setStatus(false);
    console.error(e);
  }
})();
