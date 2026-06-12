USE ticketing;
GO

-- Declarăm variabilele necesare pentru buclă și generare random
DECLARE @Counter INT = 11; -- Începem de la 11 pentru că ai deja 10 introduse manual
DECLARE @TicketNumber VARCHAR(10);
DECLARE @RandomStatus INT;
DECLARE @RandomPriority INT;
DECLARE @RandomUser INT;
DECLARE @RandomMinutesOffset INT;
DECLARE @SubmitDate DATETIME;

-- Variabile temporare pentru a stoca datele utilizatorului selectat aleatoriu
DECLARE @FullName NVARCHAR(100);
DECLARE @TeamName NVARCHAR(100);
DECLARE @CompanyId INT;
DECLARE @TeamId INT;

-- Dezactivăm numărarea rândurilor pentru a rula mai rapid
SET NOCOUNT ON;

WHILE @Counter <= 500
BEGIN
    -- 1. Generăm numărul de tichet (ex: INC0011, INC0102, etc.)
    SET @TicketNumber = 'INC' + RIGHT('0000' + CAST(@Counter AS VARCHAR(4)), 4);
    
    -- 2. Selectăm ID-uri random pentru Status (1-5) și Prioritate (1-4)
    SET @RandomStatus = ABS(CHECKSUM(NEWID())) % 5 + 1;
    SET @RandomPriority = ABS(CHECKSUM(NEWID())) % 4 + 1;
    
    -- 3. Alegem un utilizator complet la întâmplare (din cei 10 existenți)
    -- Folosim o tabelă temporară rapidă sau ordonare după NEWID() pentru a lua un utilizator random
    SELECT TOP 1 
        @FullName = FULL_NAME, 
        @TeamName = TEAM 
    FROM USERS 
    ORDER BY NEWID();

    -- 4. Identificăm Compania și Echipa pe baza numelui echipei din tabelul utilizatorului
    -- (Pentru a păstra logica corectă din baza ta de date)
    SELECT TOP 1 
        @TeamId = TEAM_ID, 
        @CompanyId = COMPANY_ID 
    FROM TEAMS 
    WHERE TEAM_NAME = @TeamName;

    -- 5. Generăm o dată de înregistrare (Submit) aleatorie în ultimele 30 de zile
    SET @RandomMinutesOffset = ABS(CHECKSUM(NEWID())) % 43200; -- minute în 30 de zile
    SET @SubmitDate = DATEADD(MINUTE, -@RandomMinutesOffset, GETDATE());

    -- 6. Inserăm tichetul cu datele corelate
    INSERT INTO INCIDENT_TICKETS (
        TICKET_NUMBER, STATUS_ID, PRIORITY_ID, COMPANY_ID, TEAM_ID, 
        PROJECT, ASSIGNED_PERSON, SERVICE, DESCRIPTION, NOTES, RESOLUTION, 
        CATEGORY_TIER_1, CATEGORY_TIER_2, CATEGORY_TIER_3, 
        SUBMIT_DATETIME, RESOLVED_DATETIME, CLOSED_DATETIME, LAST_MODIFIED_DATETIME, 
        ESTIMATED_RESOLUTION_DATETIME, RESOLUTION_CATEGORY, PENDING_DURATION
    )
    VALUES (
        @TicketNumber,
        @RandomStatus,
        @RandomPriority,
        @CompanyId,
        @TeamId,
        CASE (@Counter % 4) 
            WHEN 0 THEN 'Billing' WHEN 1 THEN 'Network' WHEN 2 THEN 'Portal' ELSE 'CRM' 
        END, -- Proiecte dinamice
        @FullName, -- Utilizatorul selectat random
        CASE (@Counter % 4) 
            WHEN 0 THEN 'API' WHEN 1 THEN 'Network' WHEN 2 THEN 'UI' ELSE 'Backend' 
        END, -- Servicii dinamice
        'Generated incident ticket description for ' + @TicketNumber,
        CASE WHEN @RandomStatus > 1 THEN 'Investigation notes for ' + @TicketNumber ELSE NULL END,
        CASE WHEN @RandomStatus IN (3,4) THEN 'Resolved automatically via script' ELSE NULL END,
        CASE WHEN @Counter % 2 = 0 THEN 'App' ELSE 'Infra' END,
        CASE WHEN @Counter % 2 = 0 THEN 'Backend' ELSE 'Network' END,
        'Auto Issue',
        @SubmitDate,
        CASE WHEN @RandomStatus IN (3,4) THEN DATEADD(HOUR, 2, @SubmitDate) ELSE NULL END, -- Data Rezolvare
        CASE WHEN @RandomStatus = 4 THEN DATEADD(HOUR, 3, @SubmitDate) ELSE NULL END, -- Data Închidere
        DATEADD(MINUTE, 30, @SubmitDate), -- Ultima modificare
        DATEADD(HOUR, 24, @SubmitDate), -- Estimare rezolvare
        CASE WHEN @RandomStatus IN (3,4) THEN 'Fix' ELSE NULL END,
        CASE WHEN @RandomStatus = 5 THEN 45 ELSE 0 END -- Minute de așteptare dacă e Pending
    );

    -- Incrementăm contorul
    SET @Counter = @Counter + 1;
END;

SET NOCOUNT OFF;
PRINT 'Generarea celor 500 de tichete s-a finalizat cu succes!';
GO