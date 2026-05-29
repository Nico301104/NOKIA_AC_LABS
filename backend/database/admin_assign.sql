USE ticketing;
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