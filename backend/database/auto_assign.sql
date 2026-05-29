USE ticketing;
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