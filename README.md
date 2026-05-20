# Nokia Ticket Filter — Frontend (M4)

React + Vite + Axios + React Router. Doar frontend deocamdată.

## Cerințe

- **Node 18+** (verifică: `node -v`)
- npm sau pnpm sau yarn

## Setup

```bash
# 1. Instalează dependențele
npm install

# 2. Pornește dev server-ul
npm run dev
```

Aplicația rulează pe **http://localhost:5173**. Ruta `/login` afișează placeholder-ul cu temă cyber-telecom (mov / verde / grafit, aspect 3D).

## Structură

```
src/
├── main.jsx                  # Entry point (BrowserRouter + AuthProvider)
├── App.jsx                   # Routing principal
├── index.css                 # Temă globală + fundal cu profunzime
├── pages/
│   ├── Login.jsx + Login.css # Login placeholder cu aspect 3D
│   ├── Dashboard.jsx         # Protejat
│   └── Tickets.jsx           # Protejat
├── services/
│   └── api.js                # Instanță Axios + interceptors (JWT)
├── context/
│   └── AuthContext.jsx       # Stare globală autentificare
└── components/
    └── ProtectedRoute.jsx    # Guard pentru rute protejate
```

## Done — checklist M4

- [x] `npm run dev` pornit pe portul **5173**
- [x] Ruta `/login` afișează placeholder
- [x] Axios instalat cu instanță centralizată (`src/services/api.js`)
- [x] React Router cu rute protejate
- [x] `AuthContext` funcțional (fără backend deocamdată)
- [x] Estetică modernă 3D — mov / verde / grafit

## Configurare backend (când va fi gata)

Schimbi `VITE_API_URL` în `.env` și aliniezi portul cu CORS-ul din `Program.cs`:

```csharp
// În backend C#
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
```

## Următorii pași (M5+)

- Login real prin `POST /api/auth/login` → JWT
- Pagina Tickets cu filtre (status, prioritate, zonă, dată)
- Detaliu tichet + acțiuni
