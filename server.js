require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── RESUMEN GENERAL ────────────────────────────────────────────────────────
app.get('/api/resumen', async (req, res) => {
  try {
    const [{ count: totalDelitos }, { count: totalUbicaciones }, { count: totalFechas }, { count: totalSexos }] = await Promise.all([
      supabase.from('fact_delitos').select('*', { count: 'exact', head: true }),
      supabase.from('dim_ubicacion').select('*', { count: 'exact', head: true }),
      supabase.from('dim_fecha').select('*', { count: 'exact', head: true }),
      supabase.from('dim_sexo').select('*', { count: 'exact', head: true }),
    ]);
    res.json({ totalDelitos, totalUbicaciones, totalFechas, totalSexos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELITOS POR AÑO ────────────────────────────────────────────────────────
app.get('/api/delitos-por-anio', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('delitos_por_anio');
    if (error) {
      // Fallback: join manual
      const { data: d2, error: e2 } = await supabase
        .from('fact_delitos')
        .select('cantidad, dim_fecha!inner(anio)')
        .limit(50000);
      if (e2) throw e2;
      const grouped = {};
      d2.forEach(r => {
        const anio = r.dim_fecha.anio;
        grouped[anio] = (grouped[anio] || 0) + (r.cantidad || 1);
      });
      const result = Object.entries(grouped)
        .map(([anio, total]) => ({ anio: parseInt(anio), total }))
        .sort((a, b) => a.anio - b.anio);
      return res.json(result);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELITOS POR MES ────────────────────────────────────────────────────────
app.get('/api/delitos-por-mes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fact_delitos')
      .select('cantidad, dim_fecha!inner(mes, nombre_mes)')
      .limit(100000);
    if (error) throw error;
    const grouped = {};
    data.forEach(r => {
      const key = `${r.dim_fecha.mes}-${r.dim_fecha.nombre_mes}`;
      grouped[key] = (grouped[key] || 0) + (r.cantidad || 1);
    });
    const result = Object.entries(grouped)
      .map(([key, total]) => {
        const [mes, nombre_mes] = key.split('-');
        return { mes: parseInt(mes), nombre_mes, total };
      })
      .sort((a, b) => a.mes - b.mes);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELITOS POR DÍA DE SEMANA ───────────────────────────────────────────────
app.get('/api/delitos-por-dia-semana', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fact_delitos')
      .select('cantidad, dim_fecha!inner(dia_semana)')
      .limit(100000);
    if (error) throw error;
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const grouped = {};
    data.forEach(r => {
      const d = r.dim_fecha.dia_semana;
      grouped[d] = (grouped[d] || 0) + (r.cantidad || 1);
    });
    const result = Object.entries(grouped)
      .map(([dia, total]) => ({ dia: parseInt(dia), nombre: dias[parseInt(dia)] || `Día ${dia}`, total }))
      .sort((a, b) => a.dia - b.dia);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELITOS POR SEXO ────────────────────────────────────────────────────────
app.get('/api/delitos-por-sexo', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fact_delitos')
      .select('cantidad, dim_sexo!inner(sexo)')
      .limit(100000);
    if (error) throw error;
    const grouped = {};
    data.forEach(r => {
      const s = r.dim_sexo.sexo || 'Sin dato';
      grouped[s] = (grouped[s] || 0) + (r.cantidad || 1);
    });
    const result = Object.entries(grouped)
      .map(([sexo, total]) => ({ sexo, total }))
      .sort((a, b) => b.total - a.total);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TOP DEPARTAMENTOS ───────────────────────────────────────────────────────
app.get('/api/top-departamentos', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const { data, error } = await supabase
      .from('fact_delitos')
      .select('cantidad, dim_ubicacion!inner(departamento)')
      .limit(100000);
    if (error) throw error;
    const grouped = {};
    data.forEach(r => {
      const dep = r.dim_ubicacion.departamento || 'Sin dato';
      grouped[dep] = (grouped[dep] || 0) + (r.cantidad || 1);
    });
    const result = Object.entries(grouped)
      .map(([departamento, total]) => ({ departamento, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TOP MUNICIPIOS ──────────────────────────────────────────────────────────
app.get('/api/top-municipios', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { data, error } = await supabase
      .from('fact_delitos')
      .select('cantidad, dim_ubicacion!inner(municipio, departamento)')
      .limit(100000);
    if (error) throw error;
    const grouped = {};
    data.forEach(r => {
      const key = `${r.dim_ubicacion.municipio} (${r.dim_ubicacion.departamento})`;
      grouped[key] = (grouped[key] || 0) + (r.cantidad || 1);
    });
    const result = Object.entries(grouped)
      .map(([municipio, total]) => ({ municipio, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELITOS POR ZONA ────────────────────────────────────────────────────────
app.get('/api/delitos-por-zona', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fact_delitos')
      .select('cantidad, dim_ubicacion!inner(zona)')
      .limit(100000);
    if (error) throw error;
    const grouped = {};
    data.forEach(r => {
      const z = r.dim_ubicacion.zona || 'Sin dato';
      grouped[z] = (grouped[z] || 0) + (r.cantidad || 1);
    });
    const result = Object.entries(grouped)
      .map(([zona, total]) => ({ zona, total }))
      .sort((a, b) => b.total - a.total);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TABLA dim_sexo ──────────────────────────────────────────────────────────
app.get('/api/dim-sexo', async (req, res) => {
  try {
    const { data, error } = await supabase.from('dim_sexo').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TABLA dim_ubicacion (paginada) ─────────────────────────────────────────
app.get('/api/dim-ubicacion', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from('dim_ubicacion')
      .select('*', { count: 'exact' })
      .range(from, from + limit - 1);
    if (error) throw error;
    res.json({ data, total: count, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TABLA dim_fecha (resumen por año) ──────────────────────────────────────
app.get('/api/dim-fecha-resumen', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dim_fecha')
      .select('anio, nombre_mes, mes')
      .limit(10000);
    if (error) throw error;
    // Resumen: años disponibles
    const anios = [...new Set(data.map(r => r.anio))].filter(Boolean).sort();
    const meses = [...new Set(data.map(r => r.nombre_mes))].filter(Boolean);
    res.json({ totalRegistros: data.length, anios, meses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXPLORADOR: fact_delitos (paginada) ────────────────────────────────────
app.get('/api/explorar/fact-delitos', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const from  = (page - 1) * limit;

    let query = supabase
      .from('fact_delitos')
      .select('*', { count: 'exact' });

    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) throw error;
    res.json({ data, total: count, page, limit, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXPLORADOR: dim_fecha (paginada) ────────────────────────────────────────
app.get('/api/explorar/dim-fecha', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const from  = (page - 1) * limit;

    let query = supabase
      .from('dim_fecha')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`nombre_mes.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) throw error;
    res.json({ data, total: count, page, limit, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXPLORADOR: dim_ubicacion (paginada + búsqueda) ─────────────────────────
app.get('/api/explorar/dim-ubicacion', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const from  = (page - 1) * limit;

    let query = supabase
      .from('dim_ubicacion')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`departamento.ilike.%${search}%,municipio.ilike.%${search}%,zona.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) throw error;
    res.json({ data, total: count, page, limit, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXPLORADOR: dim_sexo (completa) ─────────────────────────────────────────
app.get('/api/explorar/dim-sexo', async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from('dim_sexo')
      .select('*', { count: 'exact' });
    if (error) throw error;
    res.json({ data, total: count, page: 1, limit: count, pages: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Dashboard de Delitos listo\n`);
});
