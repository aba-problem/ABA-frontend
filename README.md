# ABA Frontend

Plataforma de bases de datos SQL gratuitas para estudiantes y desarrolladores.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 7
- Lucide React (iconos)

## Requisitos previos

- Node.js >= 18
- npm >= 9

## Instalación

```bash
cd ABA-frontend
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

El servidor de desarrollo escucha en `0.0.0.0` (todas las interfaces de red).

## Build de producción

```bash
npm run build
npm run preview
```

La salida se genera en `dist/`. El preview escucha en `http://localhost:4173`.

## Estructura del proyecto

```
src/
├── api/                    # Capa de comunicación con el backend
│   ├── types.ts            # DTOs y tipos de respuesta
│   ├── client.ts           # Fetch wrapper, manejo de CSRF, errores
│   ├── auth.ts             # OAuth login (Google/GitHub), sesión
│   ├── dashboard.ts        # CRUD de bases de datos
│   ├── provisioning.ts     # Creación de bases de datos
│   └── landing.ts          # Estadísticas públicas
├── contexts/
│   └── AuthContext.tsx      # Estado de autenticación global
├── hooks/
│   └── useApi.ts           # Hook genérico para llamadas API
├── pages/
│   ├── Login.tsx           # Página de login OAuth
│   ├── Landing.tsx         # Landing page pública
│   ├── auth/
│   │   ├── AuthSuccess.tsx # Callback post-OAuth
│   │   └── AuthError.tsx   # Error de autenticación
│   └── dashboard/
│       ├── DashboardLayout.tsx    # Shell con sidebar colapsable
│       ├── Overview.tsx           # Resumen con stats y DBs recientes
│       ├── DatabasesPage.tsx      # Lista completa de bases de datos
│       ├── DatabaseDetailPage.tsx # Detalle de una DB + credenciales
│       └── NewDatabasePage.tsx    # Flujo de creación de DB
├── ds/                     # Design System (componentes reutilizables)
│   ├── Button.tsx          # Botones con variantes y estados
│   ├── Badge.tsx           # Badges e indicadores de estado
│   ├── Modal.tsx           # Diálogo modal controlado
│   └── Skeleton.tsx        # Placeholder de carga animado
├── data.ts                 # Contenido estático (FAQ)
├── index.css               # Tokens del design system y animaciones
├── App.tsx                 # Router con rutas protegidas
└── main.tsx                # Punto de entrada
```

## Backend

El frontend se conecta a la API en `https://api.aba.andrescortes.dev`.

### CORS

Para desarrollo local, el backend debe tener whitelisted `http://localhost:5173`. Si no lo está, verás errores de CORS en la consola del navegador.

### Autenticación

- OAuth2 con Google y GitHub
- Cookies HttpOnly (JWT) — todas las peticiones usan `credentials: 'include'`
- CSRF Double Submit Cookie: el token se lee de `XSRF-TOKEN` y se envía como `X-CSRF-TOKEN`

### Rate limits

| Endpoint | Límite |
|----------|--------|
| `POST /api/provisioning/create` | 1 cada 10 min |
| `GET /api/dashboard/credenciales/:id` | 5 por hora |
| Dashboard general | Sliding window |

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build de producción |
