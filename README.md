# Nokia KPI Dashboard & Ticket Visualizer — Frontend

React + TypeScript + Vite + Recharts + Axios.

## Cerințe

- **Node 18+** (verifică: `node -v`)
- Backend FastAPI pornit pe portul **8000** conectat la SQL Server

## Setup

```bash
cd frontend
npm install
npm run dev
```

Aplicația rulează local pe http://localhost:5173.

## Structura aplicatiei (modul 2)

```
Nokia_Team3/
├── backend/# FastAPI (Python)
│   ├── main.py # Entry point, CORS, routere
│   ├── kpi.py   # Motorul de calcul (logica dashboard-ului)    
│   ├── models.py # Modele SQLAlchemy
│   ├── seed_tickets.py
│   └── database.py # Conexiune SQL Server
├── database/ 
│   ├──display.sql 
│   ├──insert.sql 
│   ├──procedures.sql 
│   └──setup.sql 
└── frontend/         # React + Vite (TypeScript)
    └── src/
        ├── pages/
        │    ├── Home
        │    │   └── Home.tsx
        │    └── Dashboard
        │        └── Dashboard.tsx
        ├── components/
        │   ├── footer
        │   │   └── Footer.tsx
        │   ├── header
        │   │   └── Header.tsx
        │   ├── KPICollapsibleDrawer
        │   │   └── KPICollapsibleDrawer.tsx
        │   ├── KPIDashBoard
        │   │   ├── KPIBarChart
        │   │   │   └── KPIBarChart.tsx
        │   │   ├── KPICard
        │   │   │   └── KPICard.tsx
        │   │   ├── KPIDonutChart
        │   │   │   └── KPIDonutChart.tsx
        │   │   ├── KPIDashBoard.tsx
        │   └── KPIFilterBar
        │       └── KPIFilterBar.tsx
        └── types/
            ├── KPI.ts
            └──  Ticket.ts
      

```

## Pagini și Componente
### Home (/)
Pagina de introducere și prezentare a proiectului.

Oferă o descriere rapidă a scopului aplicației și un link/buton de acces direct către zona de monitorizare.

### Dashboard (/dashboard)
Ecranul analitic principal. Este un hub de date care integrează:

**KPIFilterBar**: Sistem de filtrare cu selecție multiplă pentru Echipe, Statusuri și Priorități, alături de un selector de perioadă (startDate / endDate). Schimbarea oricărui filtru declanșează automat o nouă cerere optimizată către backend.

**KPIDashBoard** (Grid Vizual):

**KPICards** (Indicatori de impact): Afișează 5 casete statistice: Total Tickets, Average Resolution Time (în ore), Unresolved Tickets %, Resolved Tickets % și Overdue Tickets % (procentul de tichete cu timp depășit din totalul celor rezolvate).

**KPIBarCharts** (Grafice cu bare Recharts): Reprezentări grafice pentru volumul de tichete distribuite pe priorități, tichete per echipă, timpul mediu de rezolvare per echipă și distribuția volumului pe intervale orare SLA.

**KPIDonutCharts** (Grafice circulare Recharts): Diagrame de tip gogoașă pentru proporția statusurilor și trei grafice separate pentru categorii (Category Tier 1, 2 și 3).

**KPICollapsibleDrawer**: Panou retractabil, folosit pentru a izola interfața sau a afișa graficele la cerere, prevenind aglomerarea ecranului.

## Fluxul de Date și Integrarea API
Aplicația utilizează o strategie de agregare a datelor pentru a asigura performanță maximă. La încărcarea dashboard-ului sau la modificarea filtrelor, se efectuează un singur request HTTP asincron către endpoint-ul agregat din backend:

GET /kpi/dashboard -> Returnează un obiect JSON complet care conține simultan toate cele 12 KPI-uri calculate de procedurile stocate din SQL Server.

Opțiunile din dropdown-urile componentei KPIFilterBar sunt încărcate dinamic la pornire prin apelarea rutei /kpi/filters. Acest lucru asigură că orice modificare adusă nomenclatoarelor din baza de date (ex: adăugarea unei echipe noi) este reflectată instant în interfață, fără modificări în codul frontend.

Configurare
URL-ul backend-ului se setează în fișierul local frontend/.env:

Code snippet
VITE_API_URL=http://localhost:8000
Pornire completă (Backend + Frontend)
Bash
## Terminal 1 — Pornire Backend (FastAPI + Uvicorn)
```bash
cd backend
uvicorn main:app --reload --port 8000
```

## Terminal 2 — Pornire Frontend (Vite)
```bash
cd frontend
npm run dev
```