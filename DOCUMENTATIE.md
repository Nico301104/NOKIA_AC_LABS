# Documentatie - Nokia Ticketing System

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
        │   ├── Login.tsx
        │   ├── Dashboard.tsx
        │   └── Tickets.tsx
        ├── services/api.ts   # Axios + interceptori
        └── context/AuthContext.tsx
```

---

## Flow general

```
Utilizator → Accesează dashboard-ul în frontend.
Frontend → Apelează endpoint-ul /filters pentru a popula meniurile de filtrare (statusuri, echipe, priorități).
Utilizator → Selectează criteriile de filtrare (status, prioritate, echipă, interval orar).
Frontend → Trimite cererea către /dashboard cu parametrii de filtrare în URL.
Backend → Procesează filtrele și apelează funcțiile de calcul corespunzătoare.
Backend → Execută proceduri stocate (EXEC dbo.procedure_name) pentru interogarea bazei de date.
Baza de date → Returnează seturile de date brute pentru fiecare indicator.
Backend → Sintetizează datele (calcul procente, medii, agregări) și returnează un JSON complet către frontend.
Frontend → Afișează datele sub formă de carduri, grafice de tip pie și bar chart-uri.
```

---

## Logica de Dashboard & KPI-uri

Sistemul echipei 3 este construit în jurul unui motor de calcul centralizat care transformă datele brute în indicatori de performanță.

### Endpoint-ul principal — GET /kpi/dashboard
Acesta execută simultan peste 10 funcții de analiză, returnând un obiect JSON complex ce conține:
1. Volume: Total tichete, distribuție pe statusuri și priorități (Pie/Bar charts).
2. Eficiență: Timp mediu de rezolvare (total și per echipă) calculat în ore.
3. Procente critice: Rata de tichete rezolvate, nerezolvate și cele care au depășit termenul estimat (Overdue).
4. Categorizare: Analiza volumului pe categoriile Tier 1, 2 și 3.

### Filtrare avansată (Multi-select)
Spre deosebire de filtrele simple, sistemul nostru suportă selecții multiple:
1. Frontend-ul trimite liste de parametri (ex: status=Open&status=In Progress).
2. Backend-ul (Python) transformă listele în șiruri CSV.
3. Procedurile stocate folosesc STRING_SPLIT pentru a filtra eficient în SQL Server:

---
## Monitorizare SLA (Service Level Agreement)

O componentă unică a modulului 2 (Team 3) este gestionarea dinamică a timpilor de răspuns prin tabelul `SLA_CONFIG`.

### Configurare Dinamică
* **SLA_CONFIG:** Definește numărul de ore permis pentru fiecare prioritate (ex: Critical = 4h, High = 8h).
* **SLA Compliance:** Calculat prin compararea `SUBMIT_DATETIME` + `SLA_HOURS` cu `RESOLVED_DATETIME`.

### Intervale SLA (Dynamic CTE)
Procedura `GetKpiSlaIntervals` folosește tabele expresie comune (**CTE**) pentru a genera automat praguri de timp, fără a fi hardcodate:
* **Logică:** Generare praguri folosind `LAG()` pentru a crea intervale de tip: *Sub 4h*, *4h - 8h*, *Peste 12h*.
* **Utilitate:** Permite managementului să vadă exact unde apar blocajele în fluxul de rezolvare.

---



## Baza de date

- **Server:** `localhost\SQLEXPRESS`
- **Database:** `ticketing`
- **Autentificare:** Windows Authentication (Trusted_Connection)
- **Driver:** ODBC Driver 18 for SQL Server

### Tabele Principale:
| Tabel | Rol |
|---|---|
| `INCIDENT_TICKETS` | Tabelul central (date despre tichete, timpi, rezoluții) |
| `SLA_CONFIG` | Configurația orelor de rezolvare per prioritate |
| `USERS` / `TEAMS` | Gestiunea utilizatorilor și apartenența la echipe |
| `STATUSES` / `PRIORITIES` | Tabele de referință pentru integritatea datelor |

### Proceduri Stocate Cheie:
* `dbo.GetKpiAverageResolutionTime` — calculează media secundelor și o convertește în ore.
* `dbo.GetKpiSlaCompliance` — returnează numărul de tichete "In SLA" vs "Out of SLA".
* `dbo.GetTickets` — interogare masivă cu JOIN-uri pentru vizualizarea tabelară a datelor.

---

## Pornire aplicatie

```bash
# Backend
cd backend
uvicorn main:app --reload

# Frontend
cd frontend
npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
