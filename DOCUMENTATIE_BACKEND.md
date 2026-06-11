# Documentație Backend — Nokia KPI Engine & Data Utilities

Această documentație explică clar cum este construit și cum funcționează nucleul de calcul (backend-ul) al aplicației **Nokia Ticket Visualizer**.

---

## Ce este backend-ul?

Backend-ul reprezintă „creierul” din spatele interfeței grafice. Rolul său principal este să securizeze conexiunea cu baza de date SQL Server, să proceseze cererile de filtrare venite de la frontend și să execute procedurile stocate (Stored Procedures) pentru a calcula rapid indicatorii de performanță (KPIs). În loc să trimită mii de tichete brute prin rețea, backend-ul calculează statisticile direct la nivelul bazei de date și oferă frontend-ului răspunsuri gata optimizate pentru afișare.

Tehnologiile folosite:

| Tehnologie | Rol |
| :--- | :--- |
| **FastAPI** | Framework Python ultra-rapid folosit pentru crearea rutelor API (Endpoint-uri HTTP) |
| **SQLAlchemy** | Unealtă (ORM) care gestionează sesiunile și conexiunea securizată cu baza de date |
| **Uvicorn / Python** | Motorul de execuție și serverul web asincron care rulează codul |
| **SQL Server (dbo)** | Baza de date relațională unde sunt stocate tichetele și procedurile de calcul |

---

## Structura fișierelor

Aplicația backend este modulară, separând configurarea serverului, conexiunile și logica matematică a indicatorilor:

```text
backend/
├── main.py        ← Punctul de pornire: configurează serverul, regulile CORS și înregistrează rutele
├── kpi.py         ← Motorul de calcul: filtrează datele, apelează SQL Server și expune endpoint-urile HTTP
├── database.py    ← Configurația bazei de date: creează motorul de conexiune și sesiunile (get_db)
├── models.py      ← Structura tabelelor reflectată în codul Python (SQLAlchemy Models)
└── seed_tickets.py← Script utilitar pentru popularea bazei de date cu tichete de test
```

## Arhitectura și Mecanismele Core (`kpi.py`)

Fișierul `kpi.py` grupează toată inteligența analitică a sistemului. El este împărțit în straturi funcționale clare:

### 1. Sistemul Universal de Filtrare (`CommonKpiFilters`)
Ori de câte ori un utilizator modifică un filtru pe ecran (perioadă calendaristică, echipe, priorități sau statusuri), acești parametri ajung în funcția de filtrare.
* **Normalizarea Datelor:** Funcția preia listele de selecție multiplă și le convertește într-un format text separat prin virgulă (CSV) folosind funcția ajutătoare `list_to_csv`.
* **Manipularea Timpului:** Transformă obiectele de tip `date` în instanțe `datetime` complete. Pentru a include corect toate tichetele din ultima zi selectată, parametrul `endDate` este decalat automat cu `+1 zi` la miezul nopții.

### 2. Executorul de Proceduri (`exec_procedure`)
Pentru o viteză maximă de procesare, calculele matematice complexe nu se fac în Python, ci direct în SQL Server. Funcția `exec_procedure` automatizează apelul procedurilor stocate din baza de date, transmițând parametrii curățați în mod securizat prin interogări parametrizate:

```sql
EXEC dbo.NumeProcedura @status = :status, @priority = :priority, ...
```

## Analiza Indicatorilor (KPIs) și Maparea Vizuală

Mai jos este centralizată logica internă a celor 12 indicatori de performanță implementați în backend, alături de destinația lor pe ecranele frontend-ului:

| KPI | Funcție Backend | Sursă SQL Server (Procedură) | Tip Output / Destinație Frontend |
| :--- | :--- | :--- | :--- |
| **KPI 1** | `get_all_tickets_data` | `GetKpiTotalTickets` | Obiect cu cifră brută → `KPICard` (Total) |
| **KPI 2** | `get_tickets_by_status_data` | `GetKpiTicketsByStatus` | Listă de obiecte mapate (status/count) → `KPIDonutChart` |
| **KPI 3** | `get_tickets_by_priority_data` | `GetKpiTicketsByPriority` | Listă de obiecte (priority/count) → `KPIBarChart` |
| **KPI 4** | `get_average_resolution_time_data` | `GetKpiAverageResolutionTime` | Convertește secundele în ore (rotunjit la 2 zecimale) → `KPICard` |
| **KPI 5** | `get_unresolved_percentage_data` | `GetKpiUnresolvedTickets` | Calculează procentul raportat la total tichete → `KPICard` |
| **KPI 6** | `get_resolved_percentage_data` | `GetKpiResolvedTickets` | Calculează procentul raportat la total tichete → `KPICard` |
| **KPI 7** | `get_overdue_percentage_data` | `GetKpiOverdueTickets` | Calculează procentul de tichete întârziate raportat strict la cele rezolvate → `KPICard` |
| **KPI 8** | `get_tickets_per_team_data` | `GetKpiTicketsPerTeam` | Listă imbricată sub cheia `"data"` (team/count) → `KPIBarChart` |
| **KPI 9** | `get_average_resolution_time_per_team_data` | `GetKpiTicketsAverageResolutionTimePerTeam` | Convertește timpul mediu în ore pentru fiecare echipă în parte → `KPIBarChart` |
| **KPI 10**| `get_tickets_by_category_[1/2/3]_data` | `GetKpiTicketsByCategoryTier[1/2/3]` | Trei funcții/proceduri separate pentru clasificarea pe categorii → 3x `KPIDonutChart` |
| **KPI 11**| `get_sla_compliance_data` | `GetKpiSlaCompliance` | Calculează rata de conformitate (In SLA vs Out SLA) sub formă de procent → `Gauge / Card` |
| **KPI 12**| `get_sla_intervals_data` | `GetKpiSlaIntervals` | Distribuția volumului pe intervale orare definite → `Bar Chart / Listă` |


## Optimizarea Endpoint-urilor HTTP (Rutele API)

Backend-ul expune trei moduri inteligente de colectare a datelor, proiectate special pentru a reduce numărul de cereri în rețea și a asigura o încărcare fluidă:

* **Endpoint-uri Specifice (`/tickets/...`):** Rute dedicate pentru scenariile în care o singură componentă sau un singur grafic din pagină trebuie să își reîmprospăteze datele în mod izolat, fără a reîncărca tot ecranul.
* **Endpoint-ul Agregat (`/dashboard`):** Cea mai importantă rută. Când utilizatorul accesează dashboard-ul sau modifică filtrele globale, frontend-ul apelează o singură dată această rută. Backend-ul colectează rezultatele tuturor celor 12 KPI-uri în paralel și le trimite compact, într-un singur pachet JSON uriaș.
* **Endpoint-ul de Filtre Dinamice (`/filters`):** În loc să scriem rigid în frontend numele echipelor sau statusurile, backend-ul rulează interogări `DISTINCT` direct pe tabelele din SQL Server (`TEAMS`, `STATUSES`, `PRIORITIES`). Astfel, dacă în baza de date apare o echipă nouă, ea va apărea instant în dropdown-urile din interfață, fără modificarea codului.

---

## Fluxul Complet al Datelor (Arhitectura Backend-Bază de Date)

```text
       FRONTEND (Utilizator)
               │
               │  1. Cere date filtrate (ex: status=['Open'], startDate='2026-01-01')
               ▼
       BACKEND (FastAPI / kpi.py)
               │
               │  2. CommonKpiFilters() curăță datele și le transformă în text CSV
               │  3. Deschide o sesiune securizată prin database.py (get_db)
               ▼
       BAZA DE DATE (SQL Server)
               │
               │  4. Execută procedurile stocate (ex: EXEC dbo.GetKpiTicketsByStatus)
               │  5. SQL Server filtrează și calculează rezultatele instant
               ▼
       BACKEND (FastAPI / kpi.py)
               │
               │  6. Preia mapările SQL, rotunjește procentele și orele
               │  7. Agreghează totul într-un obiect JSON curat
               ▼
       FRONTEND (Interfață Grafică) -> Redenează graficele prin Recharts
```

## Rezumatul Rutelor API expuse

| Metodă HTTP | Endpoint | Parametri Query (Opționali) | Rol în Aplicație |
| :--- | :--- | :--- | :--- |
| `GET` | `/kpi/dashboard` | `status`, `priority`, `team`, `startDate`, `endDate` | Returnează setul complet de 12 KPI-uri dintr-un singur apel |
| `GET` | `/kpi/filters` | *Niciunul* | Returnează listele de echipe, statusuri și priorități pentru configurarea filtrelor |
| `GET` | `/kpi/tickets/total` | `status`, `priority`, `team`, `startDate`, `endDate` | Returnează doar volumul total de tichete |
| `GET` | `/kpi/tickets/sla-compliance` | `status`, `priority`, `team`, `startDate`, `endDate` | Returnează procentul de conformitate cu acordul SLA |