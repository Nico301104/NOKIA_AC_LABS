USE ticketing;
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