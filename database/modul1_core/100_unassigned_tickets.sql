USE ticketing;
GO

-- Declarăm variabilele necesare pentru buclă și generare
DECLARE @StartCounter INT;
DECLARE @EndCounter INT;
DECLARE @TicketNumber VARCHAR(50); -- Aliniat la lungimea din tables.sql
DECLARE @StatusOpenId INT;
DECLARE @RandomPriority INT;
DECLARE @RandomMinutesOffset INT;
DECLARE @SubmitDate DATETIME;

-- 1. Aflăm ID-ul exact al statusului 'Open'
SELECT @StatusOpenId = STATUS_ID FROM STATUSES WHERE STATUS_NAME = 'Open';

-- Validare de siguranță: Dacă nu găsește statusul 'Open', oprim execuția
IF @StatusOpenId IS NULL
BEGIN
    RAISERROR('Eroare: Statusul ''Open'' nu a fost găsit în tabela STATUSES. Populează mai întâi nomenclatorul!', 16, 1);
    RETURN;
END

-- 2. Aflăm dinamic de la ce număr începem generarea pentru a nu genera duplicate primary key
SELECT @StartCounter = ISNULL(MAX(CAST(SUBSTRING(TICKET_NUMBER, 4, 4) AS INT)), 0) + 1 
FROM INCIDENT_TICKETS;

-- Vom genera exact 100 de tichete noi
SET @EndCounter = @StartCounter + 99;

-- Dezactivăm numărarea rândurilor pentru performanță
SET NOCOUNT ON;

WHILE @StartCounter <= @EndCounter
BEGIN
    -- Generăm numărul de tichet formatat (ex: INC0501, INC0502, etc.)
    SET @TicketNumber = 'INC' + RIGHT('0000' + CAST(@StartCounter AS VARCHAR(4)), 4);
    
    -- Selectăm un ID random pentru Prioritate (1-4)
    SET @RandomPriority = ABS(CHECKSUM(NEWID())) % 4 + 1;
    
    -- Generăm o dată de înregistrare (Submit) aleatorie în ultimele 30 de zile
    SET @RandomMinutesOffset = ABS(CHECKSUM(NEWID())) % 43200; -- minute în 30 de zile
    SET @SubmitDate = DATEADD(MINUTE, -@RandomMinutesOffset, GETDATE());

    -- Inserăm tichetul neasignat în starea 'Open'
    INSERT INTO INCIDENT_TICKETS (
        TICKET_NUMBER, STATUS_ID, PRIORITY_ID, COMPANY_ID, TEAM_ID, 
        PROJECT, ASSIGNED_PERSON, SERVICE, DESCRIPTION, NOTES, RESOLUTION, 
        CATEGORY_TIER_1, CATEGORY_TIER_2, CATEGORY_TIER_3, 
        SUBMIT_DATETIME, RESOLVED_DATETIME, CLOSED_DATETIME, LAST_MODIFIED_DATETIME, 
        ESTIMATED_RESOLUTION_DATETIME, RESOLUTION_CATEGORY, PENDING_DURATION
    )
    VALUES (
        @TicketNumber,
        @StatusOpenId,                  -- Stare fixă: 'Open'
        @RandomPriority,                -- Prioritate random
        NULL,                           -- Fără companie (nu avem echipă determinată)
        NULL,                           -- Fără echipă (TEAM_ID IS NULL)
        CASE (@StartCounter % 4) 
            WHEN 0 THEN 'Billing' WHEN 1 THEN 'Network' WHEN 2 THEN 'Portal' ELSE 'CRM' 
        END,                            -- Proiecte dinamice
        NULL,                           -- Fără angajat (ASSIGNED_PERSON IS NULL)
        CASE (@StartCounter % 4) 
            WHEN 0 THEN 'API' WHEN 1 THEN 'Network' WHEN 2 THEN 'UI' ELSE 'Backend' 
        END,                            -- Servicii dinamice
        'Generated unassigned open ticket description for ' + @TicketNumber,
        NULL,                           -- Notele sunt NULL (tichetul este nou)
        NULL,                           -- Rezoluția este NULL
        CASE WHEN @StartCounter % 2 = 0 THEN 'App' ELSE 'Infra' END,
        CASE WHEN @StartCounter % 2 = 0 THEN 'Backend' ELSE 'Network' END,
        'Auto Issue',
        @SubmitDate,
        NULL,                           -- Data Rezolvare este NULL
        NULL,                           -- Data Închidere este NULL
        @SubmitDate,                    -- Ultima modificare coincide cu data deschiderii
        DATEADD(HOUR, 24, @SubmitDate), -- Estimare rezolvare standard la 24h
        NULL,                           -- Categorie rezolvare NULL
        0                               -- Timp de pending inițial 0
    );

    -- Incrementăm contorul
    SET @StartCounter = @StartCounter + 1;
END;

SET NOCOUNT OFF;
PRINT 'Generarea celor 100 de tichete deschise si neasignate s-a finalizat cu succes!';
GO