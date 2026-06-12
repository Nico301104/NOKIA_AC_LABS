# Nokia Ticket Dashboard — Frontend

React + TypeScript + Vite + Axios + React Router.

## Cerințe

- **Node 18+** (verifică: `node -v`)
- Backend FastAPI pornit pe portul **8000**

## Setup

```bash
cd frontend
npm install
npm run dev
```

Aplicația rulează pe **http://localhost:5173**.

## Structură

```
frontend/src/
├── main.tsx                        # Entry point (BrowserRouter + AuthProvider)
├── App.tsx                         # Routing principal + rute protejate
├── index.css                       # Temă globală (mov / grafit / alb)
├── vite-env.d.ts                   # Tipuri Vite
├── pages/
│   ├── Login.tsx + Login.css       # Autentificare cu JWT
│   ├── Dashboard.tsx + Dashboard.css  # Panou principal cu statistici și tabel
│   └── Tickets.tsx                 # Listă completă tichete cu sortare și paginare
├── components/
│   └── NavBar.tsx                  # Bară navigare cu logout
├── context/
│   └── AuthContext.tsx             # Stare globală autentificare (token JWT)
└── services/
    └── api.ts                      # Instanță Axios cu interceptor JWT
```

## Pagini

### Login (`/login`)
- Formular de autentificare cu username și parolă
- Trimite `POST /auth/login` și salvează token-ul JWT în `localStorage`
- Redirecționează automat la `/dashboard` dacă utilizatorul e deja autentificat

### Dashboard (`/dashboard`)
- **Statistici** (5 carduri): Total tichete, Deschise, În lucru, Finalizate, Critice
  - Cardul *Critice* are animație pulsantă roșie ca să iasă în evidență
  - *În lucru* = `Pending` + `In Progress`
  - *Finalizate* = `Closed` + `Resolved` (nu include Pending)
- **Tabel tichete recente** — primele 10 tichete sortate după dată
- Rândurile cu prioritate **Critical** sunt evidențiate cu bordură și fundal roșu
- Buton **TOATE →** navighează la pagina completă de tichete

### Tichete (`/tickets`)
- Tabel paginat cu toate tichetele (10 / 25 / 50 pe pagină)
- **Sortare** după: Dată, Prioritate, Status — crescător sau descrescător
  - Sortarea pe prioritate respectă ordinea: Critical → High → Medium → Low
- Rândurile cu prioritate **Critical** sunt evidențiate cu bordură roșie
- **Export CSV** — descarcă toate tichetele (necesită autentificare)
- Paginare completă cu butoane de navigare

## Autentificare

Token-ul JWT este stocat în `localStorage` sub cheia `token`. Instanța Axios din `services/api.ts` atașează automat header-ul `Authorization: Bearer <token>` la fiecare request. La logout, token-ul este șters și utilizatorul este redirecționat la `/login`.

## Configurare

URL-ul backend-ului se setează în `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

## Pornire completă (frontend + backend)

```bash
# Terminal 1 — backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```
