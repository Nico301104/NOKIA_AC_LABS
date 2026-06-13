USE master;
GO


-- Verifica daca db exista si o sterge daca da
-- Mai intai seteaza baza de date pe single user pentru a o putea sterge
IF DB_ID('ticketing') IS NOT NULL
BEGIN
    ALTER DATABASE ticketing SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ticketing;
END

DROP DATABASE IF EXISTS ticketing;
GO

CREATE DATABASE ticketing;
GO

USE ticketing;
GO

CREATE TABLE COMPANIES(
    COMPANY_ID INT IDENTITY(1,1) PRIMARY KEY,
    COMPANY_NAME VARCHAR(100) NOT NULL
);
GO

CREATE TABLE TEAMS(
    TEAM_ID INT IDENTITY(1,1) PRIMARY KEY,
    TEAM_NAME VARCHAR(100) NOT NULL UNIQUE,
    COMPANY_ID INT FOREIGN KEY REFERENCES COMPANIES(COMPANY_ID)
);
GO

CREATE TABLE USERS (
    USER_ID INT IDENTITY(1,1) PRIMARY KEY,
    FULL_NAME VARCHAR(100) NOT NULL UNIQUE,
    EMAIL VARCHAR(100),
    TEAM VARCHAR(100),
    FOREIGN KEY (TEAM) REFERENCES TEAMS(TEAM_NAME)
);
GO

CREATE TABLE STATUSES(
    STATUS_ID INT IDENTITY(1,1) PRIMARY KEY,
    STATUS_NAME VARCHAR(50) NOT NULL
);
GO

CREATE TABLE PRIORITIES(
    PRIORITY_ID INT IDENTITY(1,1) PRIMARY KEY,
    PRIORITY_NAME VARCHAR(50) NOT NULL
);
GO

CREATE TABLE INCIDENT_TICKETS(
    TICKET_NUMBER VARCHAR(50) PRIMARY KEY,
    COMPANY_ID INT FOREIGN KEY REFERENCES COMPANIES(COMPANY_ID),
    TEAM_ID INT FOREIGN KEY REFERENCES TEAMS(TEAM_ID),
    STATUS_ID INT FOREIGN KEY REFERENCES STATUSES(STATUS_ID),
    PRIORITY_ID INT FOREIGN KEY REFERENCES PRIORITIES(PRIORITY_ID),
    PROJECT VARCHAR(100),
    ASSIGNED_PERSON VARCHAR(100) FOREIGN KEY REFERENCES USERS(FULL_NAME),
    SERVICE VARCHAR(100),
    DESCRIPTION TEXT,
    NOTES TEXT,
    RESOLUTION TEXT,
    CATEGORY_TIER_1 VARCHAR(100),
    CATEGORY_TIER_2 VARCHAR(100),
    CATEGORY_TIER_3 VARCHAR(100),
    SUBMIT_DATETIME DATETIME,
    RESOLVED_DATETIME DATETIME,
    CLOSED_DATETIME DATETIME,
    LAST_MODIFIED_DATETIME DATETIME,
    ESTIMATED_RESOLUTION_DATETIME DATETIME,
    RESOLUTION_CATEGORY VARCHAR(100),
    PENDING_DURATION INTEGER
);
GO

CREATE TABLE SLA_CONFIG (
    SLA_ID INT PRIMARY KEY IDENTITY(1,1),
    PRIORITY_ID INT NOT NULL FOREIGN KEY REFERENCES PRIORITIES(PRIORITY_ID),
    SLA_HOURS INT NOT NULL
);
GO


CREATE TABLE Conversations
(
    ConversationID INT PRIMARY KEY IDENTITY (1,1),
    UserID         INT         NOT NULL,
    Ticket         VARCHAR(50) NOT NULL,

    FOREIGN KEY (UserID) REFERENCES Users (USER_ID),
    FOREIGN KEY (Ticket) REFERENCES INCIDENT_TICKETS (TICKET_NUMBER)
);
GO

CREATE TABLE Messages
(
    MessageID      INT PRIMARY KEY IDENTITY (1,1),
    ConversationID INT          NOT NULL,
    SenderRole     VARCHAR(20)  NOT NULL
        CHECK (SenderRole IN ('System', 'Assistant', 'User', 'Developer', 'CompletionTool', 'Function')),
    Message        VARCHAR(MAX) NOT NULL,
    Sent_Datetime  DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (ConversationID) REFERENCES Conversations (ConversationID),
);
GO

ALTER TABLE USERS
ADD HASHED_PASSWORD VARCHAR(255) NULL;
GO

ALTER TABLE USERS
ADD IS_TEAM_ADMIN BIT NOT NULL DEFAULT 0;
GO

CREATE OR ALTER PROCEDURE sp_AdminAssignTicket
    @TicketNumber VARCHAR(50),
    @AdminFullName VARCHAR(100),
    @TargetUserFullName VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificăm dacă cel care face acțiunea este înregistrat ca Admin
    DECLARE @IsAdmin BIT;
    DECLARE @AdminTeamName VARCHAR(100);

    SELECT @IsAdmin = IS_TEAM_ADMIN, @AdminTeamName = TEAM
    FROM USERS WHERE FULL_NAME = @AdminFullName;

    IF @IsAdmin IS NULL OR @IsAdmin = 0
    BEGIN
        RAISERROR('Eroare: Utilizatorul curent nu are permisiuni de Team Admin.', 16, 1);
        RETURN;
    END

    -- Verificăm dacă utilizatorul țintă (angajatul) există și face parte din ACEEAȘI echipă
    DECLARE @TargetUserTeamName VARCHAR(100);
    SELECT @TargetUserTeamName = TEAM FROM USERS WHERE FULL_NAME = @TargetUserFullName;

    IF @TargetUserTeamName IS NULL
    BEGIN
        RAISERROR('Eroare: Angajatul căruia vrei să îi asignezi tichetul nu există.', 16, 1);
        RETURN;
    END

    IF @AdminTeamName <> @TargetUserTeamName
    BEGIN
        RAISERROR('Eroare: Un Team Admin poate asigna tichete doar membrilor din propria echipă.', 16, 1);
        RETURN;
    END

    -- Preluăm TEAM_ID-ul echipei pentru a-l salva în tichet
    DECLARE @TeamId INT;
    SELECT @TeamId = TEAM_ID FROM TEAMS WHERE TEAM_NAME = @AdminTeamName;

    -- Preluăm ID-urile exacte pentru statusurile 'Open' și 'Assigned'
    DECLARE @StatusOpenId INT;
    DECLARE @StatusAssignedId INT;

    SELECT @StatusOpenId = STATUS_ID FROM STATUSES WHERE STATUS_NAME = 'Open';
    SELECT @StatusAssignedId = STATUS_ID FROM STATUSES WHERE STATUS_NAME = 'Assigned';

    -- Verificăm dacă tichetul este 'Open' și complet liber
    IF NOT EXISTS (
        SELECT 1 FROM INCIDENT_TICKETS
        WHERE TICKET_NUMBER = @TicketNumber
          AND STATUS_ID = @StatusOpenId
          AND TEAM_ID IS NULL
          AND ASSIGNED_PERSON IS NULL
    )
    BEGIN
        RAISERROR('Eroare: Tichetul nu poate fi asignat. Doar tichetele cu statusul ''Open'' și nealocate pot fi preluate de admin.', 16, 1);
        RETURN;
    END

    -- Actualizăm tichetul cu noul angajat, echipa și noul status 'Assigned'
    UPDATE INCIDENT_TICKETS
    SET
        ASSIGNED_PERSON = @TargetUserFullName,
        TEAM_ID = @TeamId,
        STATUS_ID = @StatusAssignedId, -- Schimbă statusul automat în 'Assigned'
        LAST_MODIFIED_DATETIME = GETDATE()
    WHERE TICKET_NUMBER = @TicketNumber;

    PRINT 'Succes: Tichetul ' + @TicketNumber + ' a fost asignat cu succes de către Team Admin către ' + @TargetUserFullName + '.';
END;
GO


CREATE OR ALTER PROCEDURE sp_ChangeTicketStatus
    @TicketNumber VARCHAR(50),
    @NewStatusId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Preluăm numele statusului pentru a ști exact ce regulă aplicăm
    DECLARE @StatusName VARCHAR(50);
    SELECT @StatusName = STATUS_NAME FROM STATUSES WHERE STATUS_ID = @NewStatusId;

    --Dacă ID-ul trimis nu există în tabelă, oprim procedura
    IF @StatusName IS NULL
    BEGIN
        RAISERROR('Eroare: Statusul specificat nu există în nomenclator.', 16, 1);
        RETURN;
    END

    -- Actualizăm tichetul în funcție de statusul ales
    UPDATE INCIDENT_TICKETS
    SET
        STATUS_ID = @NewStatusId,
        LAST_MODIFIED_DATETIME = GETDATE(),

        -- Dacă statusul devine 'Resolved', salvăm data curentă în RESOLVED_DATETIME
        RESOLVED_DATETIME = CASE WHEN @StatusName = 'Resolved' THEN GETDATE() ELSE RESOLVED_DATETIME END,

        -- Dacă statusul devine 'Closed', salvăm data curentă în CLOSED_DATETIME
        CLOSED_DATETIME = CASE WHEN @StatusName = 'Closed' THEN GETDATE() ELSE CLOSED_DATETIME END
    WHERE TICKET_NUMBER = @TicketNumber;

END;
GO


CREATE OR ALTER PROCEDURE sp_AdminAssignTicket
    @TicketNumber VARCHAR(50),
    @AdminFullName VARCHAR(100),
    @TargetUserFullName VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificăm dacă cel care face acțiunea este înregistrat ca Admin
    DECLARE @IsAdmin BIT;
    DECLARE @AdminTeamName VARCHAR(100);

    SELECT @IsAdmin = IS_TEAM_ADMIN, @AdminTeamName = TEAM
    FROM USERS WHERE FULL_NAME = @AdminFullName;

    IF @IsAdmin IS NULL OR @IsAdmin = 0
    BEGIN
        RAISERROR('Eroare: Utilizatorul curent nu are permisiuni de Team Admin.', 16, 1);
        RETURN;
    END

    -- Verificăm dacă utilizatorul țintă (angajatul) există și face parte din ACEEAȘI echipă
    DECLARE @TargetUserTeamName VARCHAR(100);
    SELECT @TargetUserTeamName = TEAM FROM USERS WHERE FULL_NAME = @TargetUserFullName;

    IF @TargetUserTeamName IS NULL
    BEGIN
        RAISERROR('Eroare: Angajatul căruia vrei să îi asignezi tichetul nu există.', 16, 1);
        RETURN;
    END

    IF @AdminTeamName <> @TargetUserTeamName
    BEGIN
        RAISERROR('Eroare: Un Team Admin poate asigna tichete doar membrilor din propria echipă.', 16, 1);
        RETURN;
    END

    -- Preluăm TEAM_ID-ul echipei pentru a-l salva în tichet
    DECLARE @TeamId INT;
    SELECT @TeamId = TEAM_ID FROM TEAMS WHERE TEAM_NAME = @AdminTeamName;

    -- Preluăm ID-urile exacte pentru statusurile 'Open' și 'Assigned'
    DECLARE @StatusOpenId INT;
    DECLARE @StatusAssignedId INT;

    SELECT @StatusOpenId = STATUS_ID FROM STATUSES WHERE STATUS_NAME = 'Open';
    SELECT @StatusAssignedId = STATUS_ID FROM STATUSES WHERE STATUS_NAME = 'Assigned';

    -- Verificăm dacă tichetul este 'Open' și complet liber
    IF NOT EXISTS (
        SELECT 1 FROM INCIDENT_TICKETS
        WHERE TICKET_NUMBER = @TicketNumber
          AND STATUS_ID = @StatusOpenId
          AND TEAM_ID IS NULL
          AND ASSIGNED_PERSON IS NULL
    )
    BEGIN
        RAISERROR('Eroare: Tichetul nu poate fi asignat. Doar tichetele cu statusul ''Open'' și nealocate pot fi preluate de admin.', 16, 1);
        RETURN;
    END

    -- Actualizăm tichetul cu noul angajat, echipa și noul status 'Assigned'
    UPDATE INCIDENT_TICKETS
    SET
        ASSIGNED_PERSON = @TargetUserFullName,
        TEAM_ID = @TeamId,
        STATUS_ID = @StatusAssignedId, -- Schimbă statusul automat în 'Assigned'
        LAST_MODIFIED_DATETIME = GETDATE()
    WHERE TICKET_NUMBER = @TicketNumber;

    PRINT 'Succes: Tichetul ' + @TicketNumber + ' a fost asignat cu succes de către Team Admin către ' + @TargetUserFullName + '.';
END;
GO


CREATE OR ALTER PROCEDURE sp_SelfAssignTicket
    @TicketNumber VARCHAR(50),
    @UserFullName VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    -- Preluăm numele echipei utilizatorului și ID-ul corespunzător din TEAMS
    DECLARE @UserTeamName VARCHAR(100);
    DECLARE @UserTeamId INT;

    SELECT @UserTeamName = TEAM FROM USERS WHERE FULL_NAME = @UserFullName;
    SELECT @UserTeamId = TEAM_ID FROM TEAMS WHERE TEAM_NAME = @UserTeamName;

    -- Ne asigurăm că utilizatorul chiar există în sistem
    IF @UserTeamName IS NULL
    BEGIN
        RAISERROR('Eroare: Utilizatorul specificat nu există sau nu este alocat unei echipe.', 16, 1);
        RETURN;
    END

    -- Preluăm ID-urile exacte pentru statusurile 'Open' și 'Assigned' din tabela STATUSES
    DECLARE @StatusOpenId INT;
    DECLARE @StatusAssignedId INT;

    SELECT @StatusOpenId = STATUS_ID FROM STATUSES WHERE STATUS_NAME = 'Open';
    SELECT @StatusAssignedId = STATUS_ID FROM STATUSES WHERE STATUS_NAME = 'Assigned';

    -- Verificăm dacă tichetul este în starea 'Open' (este liber pentru a fi preluat)
    IF NOT EXISTS (
        SELECT 1 FROM INCIDENT_TICKETS
        WHERE TICKET_NUMBER = @TicketNumber
          AND STATUS_ID = @StatusOpenId
          AND TEAM_ID IS NULL
          AND ASSIGNED_PERSON IS NULL
    )
    BEGIN
        RAISERROR('Eroare: Tichetul nu poate fi asignat. Doar tichetele cu statusul ''Open'' și fără o echipă/angajat alocat pot fi preluate.', 16, 1);
        RETURN;
    END

    -- Facem update-ul propriu-zis: asociem angajatul, echipa lui și schimbăm statusul în 'Assigned'
    UPDATE INCIDENT_TICKETS
    SET
        ASSIGNED_PERSON = @UserFullName,
        TEAM_ID = @UserTeamId,
        STATUS_ID = @StatusAssignedId,
        LAST_MODIFIED_DATETIME = GETDATE()
    WHERE TICKET_NUMBER = @TicketNumber;

END;
GO


INSERT INTO COMPANIES (COMPANY_NAME)
VALUES ('Vodafone'), ('Orange'), ('Digi'), ('Telekom');
GO

INSERT INTO TEAMS (TEAM_NAME, COMPANY_ID)
VALUES ('Support', 1), ('Network', 2), ('Frontend', 3), ('Data', 4), ('DevOps', 4);
GO


INSERT INTO USERS (FULL_NAME, EMAIL, TEAM, HASHED_PASSWORD) VALUES
('Popescu Ion', 'ion.popescu@vodafone.com', 'Support', '$2b$12$DxBkiI2OOfEyvZzDbicvKOHarnPv7sEyPOZtJqGDQvBi')

INSERT INTO USERS (FULL_NAME, EMAIL, TEAM) VALUES
('Ionescu Maria', 'maria.ionescu@orange.com', 'Network'),
('Georgescu Ana', 'ana.georgescu@digi.com', 'Frontend'),
('Vasilescu Dan', 'dan.vasilescu@telekom.com', 'Data'),
('Popa Elena', 'elena.popa@vodafone.com', 'Support'),
('Radu Mihai', 'mihai.radu@digi.com', 'Frontend'),
('Enache Paul', 'paul.enache@vodafone.com', 'Support'),
('Marin Sorin', 'sorin.marin@telekom.com', 'DevOps'),
('Ilie Cristina', 'cristina.ilie@telekom.com', 'Data'),
('Tudor Alex', 'alex.tudor@orange.com', 'Support');
GO

INSERT INTO STATUSES (STATUS_NAME)
VALUES ('Open'), ('In Progress'), ('Resolved'), ('Closed'), ('Pending');
GO

INSERT INTO PRIORITIES (PRIORITY_NAME)
VALUES ('Low'), ('Medium'), ('High'), ('Critical');
GO

INSERT INTO INCIDENT_TICKETS(
    TICKET_NUMBER,
    STATUS_ID,
    PRIORITY_ID,
    COMPANY_ID,
    TEAM_ID,
    PROJECT,
    ASSIGNED_PERSON,
    SERVICE,
    DESCRIPTION,
    NOTES,
    RESOLUTION,
    CATEGORY_TIER_1,
    CATEGORY_TIER_2,
    CATEGORY_TIER_3,
    SUBMIT_DATETIME,
    RESOLVED_DATETIME,
    CLOSED_DATETIME,
    LAST_MODIFIED_DATETIME,
    ESTIMATED_RESOLUTION_DATETIME,
    RESOLUTION_CATEGORY,
    PENDING_DURATION
)
VALUES
('INC0001', 1, 3, 1, 1, 'Billing', 'Popescu Ion', 'API', 'API 500 error', NULL, NULL, 'App', 'Backend', 'API Error', '2026-03-20 10:00', NULL, NULL, '2026-03-20 10:00', '2026-03-20 14:00', NULL, 0),
('INC0002', 2, 4, 2, 2, 'Network', 'Ionescu Maria', 'Network', 'Packet loss', 'Investigating', NULL, 'Infra', 'Network', 'Packet Loss', '2026-03-19 08:00', NULL, NULL, '2026-03-20 09:00', '2026-03-19 12:00', NULL, 30),
('INC0003', 3, 2, 3, 3, 'Portal', 'Georgescu Ana', 'UI', 'Login issue', 'Replicated', 'Fixed JS', 'App', 'Frontend', 'UI Bug', '2026-03-18 14:00', '2026-03-18 16:30', NULL, '2026-03-18 16:30', '2026-03-18 18:00', 'Fix', 0),
('INC0004', 4, 1, 4, 4, 'Reports', 'Vasilescu Dan', 'DB', 'Slow query', 'Index issue', 'Added index', 'Infra', 'DB', 'Performance', '2026-03-17 09:00', '2026-03-17 12:00', '2026-03-17 13:00', '2026-03-17 13:00', '2026-03-17 17:00', 'Optimization', 0),
('INC0005', 5, 3, 1, 1, 'CRM', 'Popa Elena', 'Backend', 'Sync issue', 'Waiting client', NULL, 'App', 'Backend', 'Sync', '2026-03-21 11:00', NULL, NULL, '2026-03-21 12:00', '2026-03-21 15:00', NULL, 120),
('INC0006', 1, 2, 2, 3, 'Mobile App', 'Radu Mihai', 'UI', 'Button misaligned', NULL, NULL, 'App', 'Frontend', 'UI Issue', '2026-03-22 09:30', NULL, NULL, '2026-03-22 09:30', '2026-03-23 13:00', NULL, 0),
('INC0007', 3, 3, 3, 1, 'API Gateway', 'Enache Paul', 'API', 'Timeout error', 'Logs checked', 'Increased timeout', 'App', 'Backend', 'Timeout', '2026-03-20 07:00', '2026-03-20 10:00', NULL, '2026-03-20 10:00', '2026-03-20 11:00', 'Config Change', 0),
('INC0008', 4, 4, 4, 5, 'Infra', 'Marin Sorin', 'Server', 'Server down', 'Restarted', 'Restart server', 'Infra', 'Server', 'Crash', '2026-03-16 02:00', '2026-03-16 03:00', '2026-03-16 04:00', '2026-03-16 04:00', '2026-03-16 03:00', 'Fix', 0),
('INC0009', 2, 2, 1, 4, 'Analytics', 'Ilie Cristina', 'DB', 'Data mismatch', 'Checking ETL', NULL, 'App', 'Data', 'ETL Issue', '2026-03-23 10:00', NULL, NULL, '2026-03-23 11:00', '2026-03-23 16:00', NULL, 15),
('INC0010', 5, 1, 2, 1, 'CRM', 'Tudor Alex', 'Backend', 'Email not sent', 'Waiting SMTP', NULL, 'App', 'Backend', 'Email', '2026-03-24 08:00', NULL, NULL, '2026-03-24 09:00', '2026-03-24 12:00', NULL, 60);
GO

INSERT INTO SLA_CONFIG (PRIORITY_ID, SLA_HOURS) VALUES
(4, 8),
(3, 16),
(2, 32),
(1, 64);
GO


-- 1. Setăm Admin pentru echipa 'Support' -> Popescu Ion
UPDATE USERS
SET IS_TEAM_ADMIN = 1
WHERE FULL_NAME = 'Popescu Ion';

-- 2. Setăm Admin pentru echipa 'Network' -> Ionescu Maria
UPDATE USERS
SET IS_TEAM_ADMIN = 1
WHERE FULL_NAME = 'Ionescu Maria';

-- 3. Setăm Admin pentru echipa 'Frontend' -> Georgescu Ana
UPDATE USERS
SET IS_TEAM_ADMIN = 1
WHERE FULL_NAME = 'Georgescu Ana';

-- 4. Setăm Admin pentru echipa 'Data' -> Vasilescu Dan
UPDATE USERS
SET IS_TEAM_ADMIN = 1
WHERE FULL_NAME = 'Vasilescu Dan';

-- 5. Setăm Admin pentru echipa 'DevOps' -> Marin Sorin
UPDATE USERS
SET IS_TEAM_ADMIN = 1
WHERE FULL_NAME = 'Marin Sorin';
GO


INSERT INTO STATUSES (STATUS_NAME)
VALUES
    ('Assigned'),
    ('Create');
GO


CREATE OR ALTER PROCEDURE dbo.GetPaginatedTickets
    @search VARCHAR(100) = NULL,
    @status VARCHAR(20) = NULL,
    @team VARCHAR(100) = NULL,
    @start_date VARCHAR(20) = NULL,
    @end_date VARCHAR(20) = NULL,
    @sort_by VARCHAR(50) = 'SUBMIT_DATETIME',
    @sort_order VARCHAR(4) = 'DESC',
    @skip INT = 0,
    @limit INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    --Parse the date parameters into DATETIME format
	DECLARE @StartDateParsed DATETIME = CASE
        WHEN @start_date IS NOT NULL AND @start_date <> '' THEN CONVERT(DATETIME, @start_date + ' 00:00:00', 120)
        ELSE NULL
    END;

    DECLARE @EndDateParsed DATETIME = CASE
        WHEN @end_date IS NOT NULL AND @end_date <> '' THEN CONVERT(DATETIME, @end_date + ' 23:59:59', 120)
        ELSE NULL
    END;

    --First filter tickets based on the provided criteria
    WITH FilteredTickets AS (
        SELECT
            t.TICKET_NUMBER as Ticket_ID,
            t.DESCRIPTION as Description,
            s.STATUS_NAME as Status,
            p.PRIORITY_NAME as Priority,
            c.COMPANY_NAME as Company,
            tm.TEAM_NAME as Team,
			t.PRIORITY_ID as Priority_ID,
			t.STATUS_ID as Status_ID,
            t.SUBMIT_DATETIME as Submit_Datetime
        FROM INCIDENT_TICKETS t
        LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
        LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
        LEFT JOIN COMPANIES c ON t.COMPANY_ID = c.COMPANY_ID
        LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
        WHERE (@status IS NULL OR s.STATUS_NAME = @status)
        AND (@team IS NULL OR tm.TEAM_NAME = @team)
        AND (@StartDateParsed IS NULL OR t.SUBMIT_DATETIME >= @StartDateParsed)
        AND (@EndDateParsed IS NULL OR t.SUBMIT_DATETIME <= @EndDateParsed)
        AND (@search IS NULL
            OR t.TICKET_NUMBER LIKE '%' + @search + '%'
            OR s.STATUS_NAME LIKE '%' + @search + '%'
            OR p.PRIORITY_NAME LIKE '%' + @search + '%'
            OR c.COMPANY_NAME LIKE '%' + @search + '%'
            OR tm.TEAM_NAME LIKE '%' + @search + '%'
            )
    )

    --Second, sort the filtered tickets based on the provided sorting criteria
    SELECT * FROM FilteredTickets
    ORDER BY
        CASE WHEN @sort_order = 'ASC' THEN
            CASE @sort_by
                WHEN 'TICKET_NUMBER' THEN CAST(Ticket_ID AS VARCHAR(50))
                WHEN 'STATUS'        THEN CAST(Status_ID AS VARCHAR(50))
                WHEN 'PRIORITY'      THEN CAST(Priority_ID AS VARCHAR(50))
                WHEN 'COMPANY' THEN Company
                WHEN 'TEAM' THEN Team
               -- ELSE CONVERT(VARCHAR(50), Submit_Datetime, 120)
            END
        END ASC,

        CASE WHEN @sort_order = 'DESC' THEN
            CASE @sort_by
                WHEN 'TICKET_NUMBER' THEN CAST(Ticket_ID AS VARCHAR(50))
                WHEN 'STATUS'        THEN CAST(Status_ID AS VARCHAR(50))
                WHEN 'PRIORITY'      THEN CAST(Priority_ID AS VARCHAR(50))
                WHEN 'COMPANY' THEN Company
                WHEN 'TEAM' THEN Team
				--ELSE CONVERT(VARCHAR(50), Submit_Datetime, 120)
			END
        END DESC

    OFFSET @skip ROWS
    FETCH NEXT @limit ROWS ONLY;

    --Finally, return the total count of tickets matching the filter criteria (with pagination applied)
    SELECT COUNT(*) AS total_items FROM INCIDENT_TICKETS t
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN COMPANIES c ON t.COMPANY_ID = c.COMPANY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (@status IS NULL OR s.STATUS_NAME = @status)
        AND (@team IS NULL OR tm.TEAM_NAME = @team)
        AND (@StartDateParsed IS NULL OR t.SUBMIT_DATETIME >= @StartDateParsed)
        AND (@EndDateParsed IS NULL OR t.SUBMIT_DATETIME <= @EndDateParsed)
        AND (@search IS NULL
            OR t.TICKET_NUMBER LIKE '%' + @search + '%'
            OR s.STATUS_NAME LIKE '%' + @search + '%'
            OR p.PRIORITY_NAME LIKE '%' + @search + '%'
            OR c.COMPANY_NAME LIKE '%' + @search + '%'
            OR tm.TEAM_NAME LIKE '%' + @search + '%'
        );
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetDashboardStats
    @search VARCHAR(100) = NULL,
    @status VARCHAR(20) = NULL,
    @team VARCHAR(100) = NULL,
    @start_date VARCHAR(20) = NULL,
    @end_date VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    --Parse the date parameters into DATETIME format
	DECLARE @StartDateParsed DATETIME = CASE
        WHEN @start_date IS NOT NULL AND @start_date <> '' THEN CONVERT(DATETIME, @start_date + ' 00:00:00', 120)
        ELSE NULL
    END;

    DECLARE @EndDateParsed DATETIME = CASE
        WHEN @end_date IS NOT NULL AND @end_date <> '' THEN CONVERT(DATETIME, @end_date + ' 23:59:59', 120)
        ELSE NULL
    END;

    SELECT
        COUNT(*) AS Total_Tickets,
        SUM(CASE WHEN s.STATUS_NAME = 'Open' THEN 1 ELSE 0 END) AS Open_Tickets,
        SUM(CASE WHEN s.STATUS_NAME = 'In Progress' THEN 1 ELSE 0 END) AS InProgress_Tickets,
        SUM(CASE WHEN s.STATUS_NAME IN ('Closed','Resolved') THEN 1 ELSE 0 END) AS Completed_Tickets,
        SUM(CASE WHEN p.PRIORITY_NAME = 'Critical' THEN 1 ELSE 0 END) AS Critical_Priority_Tickets
    FROM INCIDENT_TICKETS t
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN COMPANIES c ON t.COMPANY_ID = c.COMPANY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (@status IS NULL OR s.STATUS_NAME = @status)
        AND (@team IS NULL OR tm.TEAM_NAME = @team)
        AND (@StartDateParsed IS NULL OR t.SUBMIT_DATETIME >= @StartDateParsed)
        AND (@EndDateParsed IS NULL OR t.SUBMIT_DATETIME <= @EndDateParsed)
        AND (@search IS NULL
            OR t.TICKET_NUMBER LIKE '%' + @search + '%'
            OR s.STATUS_NAME LIKE '%' + @search + '%'
            OR p.PRIORITY_NAME LIKE '%' + @search + '%'
            OR c.COMPANY_NAME LIKE '%' + @search + '%'
            OR tm.TEAM_NAME LIKE '%' + @search + '%'
        );

END;
GO


UPDATE INCIDENT_TICKETS
SET
    STATUS_ID = (SELECT STATUS_ID FROM STATUSES WHERE STATUS_NAME = 'Assigned'),
    LAST_MODIFIED_DATETIME = GETDATE()
WHERE
    STATUS_ID = (SELECT STATUS_ID FROM STATUSES WHERE STATUS_NAME = 'Open')
    AND ASSIGNED_PERSON IS NOT NULL
    AND ASSIGNED_PERSON <> '';
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiTotalTickets
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) AS total_tickets
    FROM INCIDENT_TICKETS t
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate);
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiTicketsByStatus
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT s.STATUS_NAME as status, COUNT(*) as ticket_count
    FROM INCIDENT_TICKETS t
    JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate)
    GROUP BY s.STATUS_NAME
    ORDER BY ticket_count DESC;
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiTicketsByPriority
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT p.PRIORITY_NAME as priority, COUNT(*) as ticket_count
    FROM INCIDENT_TICKETS t
    JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate)
    GROUP BY p.PRIORITY_NAME
    ORDER BY ticket_count DESC;
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiAverageResolutionTime
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(AVG(CAST(DATEDIFF(SECOND, t.SUBMIT_DATETIME, t.RESOLVED_DATETIME) as FLOAT)), 0) as avg_resolution_seconds
    FROM INCIDENT_TICKETS t
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate);
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiUnresolvedTickets
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) as unresolved_count
    FROM INCIDENT_TICKETS t
    JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE s.STATUS_NAME NOT IN ('Closed', 'Resolved')
        AND (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate);
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiResolvedTickets
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) as resolved_count
    FROM INCIDENT_TICKETS t
    JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE s.STATUS_NAME IN ('Closed', 'Resolved')
        AND (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate);
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiOverdueTickets
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) as overdue_count
    FROM INCIDENT_TICKETS t
    JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE t.ESTIMATED_RESOLUTION_DATETIME < t.RESOLVED_DATETIME
        AND t.RESOLVED_DATETIME is not NULL
        AND (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate);
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiTicketsPerTeam
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT tm.TEAM_NAME as team, COUNT(*) as ticket_count
    FROM INCIDENT_TICKETS t
    JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
      AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
      AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate)
    GROUP BY tm.TEAM_NAME
    ORDER BY ticket_count DESC;
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiTicketsAverageResolutionTimePerTeam
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        tm.TEAM_NAME as team,
        ISNULL(AVG(CAST(DATEDIFF(SECOND, t.SUBMIT_DATETIME, t.RESOLVED_DATETIME) as FLOAT)), 0) as avg_resolution_time
    FROM TEAMS tm
    LEFT JOIN INCIDENT_TICKETS t ON t.TEAM_ID = tm.TEAM_ID AND t.RESOLVED_DATETIME is not NULL
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate)
    GROUP BY tm.TEAM_NAME
    ORDER BY avg_resolution_time DESC;
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiTicketsByCategoryTier1
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(t.CATEGORY_TIER_1, 'Necunoscut') as category,
        COUNT(*) as ticket_count
    FROM INCIDENT_TICKETS t
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate)
    GROUP BY ISNULL(t.CATEGORY_TIER_1, 'Necunoscut')
    ORDER BY ticket_count DESC;
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiTicketsByCategoryTier2
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(t.CATEGORY_TIER_2, 'Necunoscut') as category,
        COUNT(*) as ticket_count
    FROM INCIDENT_TICKETS t
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate)
    GROUP BY ISNULL(t.CATEGORY_TIER_2, 'Necunoscut')
    ORDER BY ticket_count DESC;
END;
GO


CREATE OR ALTER PROCEDURE dbo.GetKpiTicketsByCategoryTier3
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(t.CATEGORY_TIER_3, 'Necunoscut') as category,
        COUNT(*) as ticket_count
    FROM INCIDENT_TICKETS t
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate)
    GROUP BY ISNULL(t.CATEGORY_TIER_3, 'Necunoscut')
    ORDER BY ticket_count DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.GetKpiSlaCompliance
    @status NVARCHAR(MAX) = NULL,
    @priority NVARCHAR(MAX) = NULL,
    @team NVARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        SUM(CASE
            WHEN t.RESOLVED_DATETIME <= DATEADD(HOUR, sc.SLA_HOURS, t.SUBMIT_DATETIME) THEN 1
            ELSE 0
        END) as in_sla_count,

        SUM(CASE
            WHEN t.RESOLVED_DATETIME > DATEADD(HOUR, sc.SLA_HOURS, t.SUBMIT_DATETIME)
                 OR (t.RESOLVED_DATETIME IS NULL AND GETDATE() > DATEADD(HOUR, sc.SLA_HOURS, t.SUBMIT_DATETIME)) THEN 1
            ELSE 0
        END) as out_sla_count
    FROM INCIDENT_TICKETS t
    INNER JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    INNER JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    INNER JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    INNER JOIN SLA_CONFIG sc ON t.PRIORITY_ID = sc.PRIORITY_ID
    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
      AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
      AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate);
END;
GO

CREATE OR ALTER PROCEDURE dbo.GetKpiSlaIntervals
    @status NVARCHAR(MAX) = NULL,
    @priority NVARCHAR(MAX) = NULL,
    @team NVARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- CTE 1: Dynamically generate lower and upper bounds from whatever is inside SLA_CONFIG
    WITH SlaBounds AS (
        SELECT
            SLA_HOURS as upper_bound,
            -- LAG fetches the previous tier's hours to serve as this tier's starting point
            ISNULL(LAG(SLA_HOURS) OVER (ORDER BY SLA_HOURS ASC), 0) as lower_bound,
            -- Construct the chart string dynamically based on the exact configuration values
            CASE
                WHEN LAG(SLA_HOURS) OVER (ORDER BY SLA_HOURS ASC) IS NULL
                THEN 'Sub ' + CAST(SLA_HOURS AS VARCHAR(5)) + 'h'
                ELSE CAST(LAG(SLA_HOURS) OVER (ORDER BY SLA_HOURS ASC) AS VARCHAR(5)) + 'h - ' + CAST(SLA_HOURS AS VARCHAR(5)) + 'h'
            END as interval_label,
            SLA_HOURS as sort_order
        FROM SLA_CONFIG
    ),

    -- CTE 2: Create a catch-all row for tickets that breach the highest configured threshold
    MaxSlaCatchAll AS (
        SELECT upper_bound FROM SlaBounds WHERE upper_bound = (SELECT MAX(SLA_HOURS) FROM SLA_CONFIG)
    ),

    -- CTE 3: Combine all configuration bounds into a unified layout map
    AllIntervalsMap AS (
        SELECT lower_bound, upper_bound, interval_label, sort_order FROM SlaBounds
        UNION ALL
        SELECT upper_bound, 999999, 'Peste ' + CAST(upper_bound AS VARCHAR(5)) + 'h', upper_bound + 1
        FROM MaxSlaCatchAll
    ),

    -- CTE 4: Gather the filtered incident tickets data and find their resolution durations
    TicketDurations AS (
        SELECT
            DATEDIFF(SECOND, t.SUBMIT_DATETIME, t.RESOLVED_DATETIME) / 3600.0 as actual_hours
        FROM INCIDENT_TICKETS t
        INNER JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
        INNER JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
        INNER JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
        WHERE t.RESOLVED_DATETIME IS NOT NULL
          AND t.SUBMIT_DATETIME IS NOT NULL
          AND (
                @status IS NULL
                OR s.STATUS_NAME IN (
                    SELECT LTRIM(RTRIM(value))
                    FROM STRING_SPLIT(@status, ',')
                )
            )
            AND (
                @priority IS NULL
                OR p.PRIORITY_NAME IN (
                    SELECT LTRIM(RTRIM(value))
                    FROM STRING_SPLIT(@priority, ',')
                )
            )
            AND (
                @team IS NULL
                OR tm.TEAM_NAME IN (
                    SELECT LTRIM(RTRIM(value))
                    FROM STRING_SPLIT(@team, ',')
                )
            )
          AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
          AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate)
    )

    -- Final Query: Match ticket hours against our dynamic range maps and aggregate
    SELECT
        m.interval_label as sla_interval,
        COUNT(t.actual_hours) as ticket_count
    FROM AllIntervalsMap m
    LEFT JOIN TicketDurations t ON t.actual_hours > m.lower_bound AND t.actual_hours <= m.upper_bound
    GROUP BY m.interval_label, m.sort_order
    ORDER BY m.sort_order ASC; -- Keeps your chart items ordering seamlessly from fastest to slowest
END;
GO

-- Procedura pentru toate ticketele din main.py:
CREATE OR ALTER PROCEDURE dbo.GetTickets
    @status VARCHAR(MAX) = NULL,
    @priority VARCHAR(MAX) = NULL,
    @team VARCHAR(MAX) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

   WITH SlaBounds AS (
        SELECT
            SLA_HOURS as upper_bound,
            ISNULL(LAG(SLA_HOURS) OVER (ORDER BY SLA_HOURS ASC), 0) as lower_bound,
            CASE
                WHEN LAG(SLA_HOURS) OVER (ORDER BY SLA_HOURS ASC) IS NULL
                THEN 'Sub ' + CAST(SLA_HOURS AS VARCHAR(5)) + 'h'
                ELSE CAST(LAG(SLA_HOURS) OVER (ORDER BY SLA_HOURS ASC) AS VARCHAR(5)) + 'h - ' + CAST(SLA_HOURS AS VARCHAR(5)) + 'h'
            END as interval_label
        FROM SLA_CONFIG
    ),

    -- CTE 2: Determine your catch-all boundary maximum limit row
    MaxSlaCatchAll AS (
        SELECT upper_bound FROM SlaBounds WHERE upper_bound = (SELECT MAX(SLA_HOURS) FROM SLA_CONFIG)
    ),

    -- CTE 3: Combine all configuration bounds into a unified layout map
    AllIntervalsMap AS (
        SELECT lower_bound, upper_bound, interval_label FROM SlaBounds
        UNION ALL
        SELECT upper_bound, 999999, 'Peste ' + CAST(upper_bound AS VARCHAR(5)) + 'h'
        FROM MaxSlaCatchAll
    )

    SELECT
        t.TICKET_NUMBER,
        s.STATUS_NAME AS STATUS,
        p.PRIORITY_NAME AS PRIORITY,
        c.COMPANY_NAME AS COMPANY,
        tm.TEAM_NAME AS TEAM,
        t.CATEGORY_TIER_1,
        t.CATEGORY_TIER_2,
        t.CATEGORY_TIER_3,
        t.SERVICE,
        t.ASSIGNED_PERSON,
        t.SUBMIT_DATETIME,
        t.RESOLVED_DATETIME,

        -- SLA Status calculation relying on 'sc'
        CASE
            WHEN t.RESOLVED_DATETIME <= DATEADD(HOUR, sc.SLA_HOURS, t.SUBMIT_DATETIME) THEN 'In SLA'
            WHEN t.RESOLVED_DATETIME > DATEADD(HOUR, sc.SLA_HOURS, t.SUBMIT_DATETIME)
                 OR (t.RESOLVED_DATETIME IS NULL AND GETDATE() > DATEADD(HOUR, sc.SLA_HOURS, t.SUBMIT_DATETIME)) THEN 'Out of SLA'
            ELSE 'In SLA'
        END AS SLA_STATUS,

        -- DYNAMIC READ: Extracts exact label text matched from our dynamic intervals matrix map CTE
        CASE
            WHEN t.RESOLVED_DATETIME IS NULL THEN 'Nerezolvat'
            ELSE ISNULL(m.interval_label, 'Necunoscut')
        END AS SLA_INTERVAL

    FROM INCIDENT_TICKETS t
    JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    JOIN COMPANIES c ON t.COMPANY_ID = c.COMPANY_ID
    JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID

    -- THE MISSING LINE: We must join SLA_CONFIG so 'sc.SLA_HOURS' exists!
    LEFT JOIN SLA_CONFIG sc ON t.PRIORITY_ID = sc.PRIORITY_ID

    LEFT JOIN AllIntervalsMap m ON (DATEDIFF(SECOND, t.SUBMIT_DATETIME, t.RESOLVED_DATETIME) / 3600.0) > m.lower_bound
        AND (DATEDIFF(SECOND, t.SUBMIT_DATETIME, t.RESOLVED_DATETIME) / 3600.0) <= m.upper_bound

    WHERE (
            @status IS NULL
            OR s.STATUS_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@status, ',')
            )
        )
        AND (
            @priority IS NULL
            OR p.PRIORITY_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@priority, ',')
            )
        )
        AND (
            @team IS NULL
            OR tm.TEAM_NAME IN (
                SELECT LTRIM(RTRIM(value))
                FROM STRING_SPLIT(@team, ',')
            )
        )
        AND (@startDate IS NULL OR t.SUBMIT_DATETIME >= @startDate)
        AND (@endDate IS NULL OR t.SUBMIT_DATETIME < @endDate)
    ORDER BY t.SUBMIT_DATETIME DESC;
END;
GO


-- Creates new conversation and returns its ID
CREATE PROCEDURE dbo.createConversation
    @UserID INT = 0,
    @TicketID nvarchar(MAX) = NULL
AS
    SET NOCOUNT ON;
    INSERT INTO Conversations(UserID, Ticket)
    VALUES (@UserID, @TicketID);
    SELECT ConversationID FROM Conversations WHERE UserID = @UserID AND Ticket = @TicketID;
GO


CREATE PROCEDURE dbo.getConversation
    @ConversationID INT = 0
AS
    SET NOCOUNT ON;
    SELECT ConversationID FROM Conversations WHERE ConversationID = @ConversationID;
GO


CREATE PROCEDURE dbo.getMessageHistory
    @ConversationID INT = 0
AS
    SET NOCOUNT ON;
    SELECT SenderRole, Message, Sent_Datetime FROM Messages
    WHERE ConversationID = @ConversationID
    ORDER BY Sent_Datetime
GO


CREATE PROCEDURE dbo.insertUserMessage
    @ConversationID INT = 0,
    @Message nvarchar(MAX) = NULL
AS
    SET NOCOUNT ON;
    INSERT INTO Messages(ConversationID, SenderRole, Message, Sent_Datetime)
    VALUES (@ConversationID, 'User', @Message, GETDATE());
GO


CREATE PROCEDURE dbo.insertAssistantMessage
    @ConversationID INT = 0,
    @Message nvarchar(MAX) = NULL
AS
    SET NOCOUNT ON;
    INSERT INTO Messages(ConversationID, SenderRole, Message, Sent_Datetime)
    VALUES (@ConversationID, 'Assistant', @Message, GETDATE());
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



-- Declarăm variabilele necesare pentru buclă și generare
DECLARE @StartCounter INT;
DECLARE @EndCounter INT;
DECLARE @TicketNumber VARCHAR(50); -- Aliniat la lungimea din tables.sql
DECLARE @RandomStatus INT;
DECLARE @RandomPriority INT;
DECLARE @RandomPerson INT;
DECLARE @RandomMinutesOffset INT;
DECLARE @SubmitDate DATETIME;

-- 2. Aflăm dinamic de la ce număr începem generarea pentru a nu genera duplicate primary key
SELECT @StartCounter = ISNULL(MAX(CAST(SUBSTRING(TICKET_NUMBER, 4, 4) AS INT)), 0) + 1
FROM INCIDENT_TICKETS;

-- Vom genera exact 100 de tichete noi
SET @EndCounter = @StartCounter + 4999;

-- Dezactivăm numărarea rândurilor pentru performanță
SET NOCOUNT ON;

WHILE @StartCounter <= @EndCounter
BEGIN
    -- Generăm numărul de tichet formatat (ex: INC0501, INC0502, etc.)
    SET @TicketNumber = 'INC' + RIGHT('0000' + CAST(@StartCounter AS VARCHAR(4)), 4);

    -- Selectăm un ID random pentru Status (1-7)
    SET @RandomStatus = ABS(CHECKSUM(NEWID())) % 7 + 1;

    -- Selectăm un ID random pentru Prioritate (1-4)
    SET @RandomPriority = ABS(CHECKSUM(NEWID())) % 4 + 1;

    -- Selectăm un ID random pentru Prioritate (1-10)
    SET @RandomPerson = ABS(CHECKSUM(NEWID())) % 10 + 1;

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
        @RandomStatus,                  -- Status random
        @RandomPriority,                -- Prioritate random
        NULL,                           -- Fără companie (nu avem echipă determinată)
        NULL,                           -- Fără echipă (TEAM_ID IS NULL)
        CASE (@StartCounter % 4)
            WHEN 0 THEN 'Billing' WHEN 1 THEN 'Network' WHEN 2 THEN 'Portal' ELSE 'CRM'
        END,                            -- Proiecte dinamice
        CASE (@StartCounter % 10)
            WHEN 0 THEN 'Popescu Ion'
            WHEN 1 THEN 'Ionescu Maria'
            WHEN 2 THEN 'Georgescu Ana'
            WHEN 3 THEN 'Vasilescu Dan'
            WHEN 4 THEN 'Popa Elena'
            WHEN 5 THEN 'Radu Mihai'
            WHEN 6 THEN 'Enache Paul'
            WHEN 7 THEN 'Marin Sorin'
            WHEN 8 THEN 'Ilie Cristina'
            WHEN 9 THEN 'Tudor Alex'
        END,
        CASE (@StartCounter % 4)
            WHEN 0 THEN 'API' WHEN 1 THEN 'Network' WHEN 2 THEN 'UI' ELSE 'Backend'
        END,                            -- Servicii dinamice
        'Generated random ticket description for ' + @TicketNumber,
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
PRINT 'Generarea celor 5000 de tichete random s-a finalizat cu succes!';
GO
