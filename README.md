# Dashboard Analítico · Delitos Colombia

Sitio web de análisis de datos construido sobre las tablas Supabase del schema `public`.

## Stack tecnológico

- **Backend:** Node.js + Express (API REST)
- **Frontend:** HTML + CSS + JavaScript vanilla + Chart.js
- **Base de datos:** Supabase (PostgreSQL)

## Estructura del proyecto

```
delitos-db/
├── server.js           ← API Express con todos los endpoints
├── package.json
├── .env                ← Variables de entorno (NO incluido en el repo)
└── public/
    ├── index.html      ← Dashboard SPA
    ├── style.css       ← Estilos (tema oscuro)
    └── app.js          ← Lógica de charts y navegación
```

## Configuración

1. Crear archivo `.env` en la raíz con:
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anon
PORT=3000
```

2. Instalar dependencias:
```bash
npm install
```

3. Arrancar el servidor:
```bash
npm start
```

4. Abrir en el navegador: `http://localhost:3000`

## Secciones del dashboard

| Sección | Contenido |
|---|---|
| **Resumen General** | KPIs, gráfico anual, donut por zona |
| **Análisis Temporal** | Línea evolutiva, barras por mes, radar días de semana |
| **Distribución Geográfica** | Top departamentos, top municipios, tabla paginada |
| **Demografía** | Pastel y barras por sexo, tabla dim_sexo |
| **Tablas de Datos** | Esquema del modelo, diagrama ERD visual |

## Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/resumen` | Conteos de cada tabla |
| GET | `/api/delitos-por-anio` | Agrupado por año |
| GET | `/api/delitos-por-mes` | Agrupado por mes |
| GET | `/api/delitos-por-dia-semana` | Agrupado por día de semana |
| GET | `/api/delitos-por-sexo` | Agrupado por categoría de sexo |
| GET | `/api/top-departamentos?limit=15` | Top departamentos |
| GET | `/api/top-municipios?limit=10` | Top municipios |
| GET | `/api/delitos-por-zona` | Agrupado por zona |
| GET | `/api/dim-sexo` | Catálogo completo de sexos |
| GET | `/api/dim-ubicacion?page=1&limit=20` | Municipios paginados |
| GET | `/api/dim-fecha-resumen` | Resumen de cobertura temporal |
