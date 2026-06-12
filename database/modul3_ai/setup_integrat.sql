-- Setup chat AI (Modul 3) adaptat pentru baza de date integrata `ticketing`.
-- Spre deosebire de schema.sql (care DROPuieste si recreeaza tot in forma
-- denormalizata a Modulului 3), acest script creeaza DOAR tabelele de
-- conversatii si procedurile de chat, fara sa atinga tabelele existente.
-- FK-urile catre USERS / INCIDENT_TICKETS sunt omise intentionat: frontend-ul
-- demo trimite user_id=1 / ticket_id='1', care pot sa nu existe in date.

IF OBJECT_ID('dbo.Conversations', 'U') IS NULL
BEGIN
    CREATE TABLE Conversations
    (
        ConversationID INT PRIMARY KEY IDENTITY (1,1),
        UserID         INT         NOT NULL,
        Ticket         VARCHAR(50) NOT NULL
    );
END;

IF OBJECT_ID('dbo.Messages', 'U') IS NULL
BEGIN
    CREATE TABLE Messages
    (
        MessageID      INT PRIMARY KEY IDENTITY (1,1),
        ConversationID INT          NOT NULL,
        SenderRole     VARCHAR(20)  NOT NULL
            CHECK (SenderRole IN ('System', 'Assistant', 'User', 'Developer', 'CompletionTool', 'Function')),
        Message        VARCHAR(MAX) NOT NULL,
        Sent_Datetime  DATETIME DEFAULT GETDATE(),

        FOREIGN KEY (ConversationID) REFERENCES Conversations (ConversationID)
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.createConversation
    @UserID INT = 0,
    @TicketID nvarchar(MAX) = NULL
AS
    SET NOCOUNT ON;
    INSERT INTO Conversations(UserID, Ticket)
    VALUES (@UserID, @TicketID);
    SELECT ConversationID FROM Conversations WHERE UserID = @UserID AND Ticket = @TicketID;
GO

CREATE OR ALTER PROCEDURE dbo.getConversation
    @ConversationID INT = 0
AS
    SET NOCOUNT ON;
    SELECT ConversationID FROM Conversations WHERE ConversationID = @ConversationID;
GO

CREATE OR ALTER PROCEDURE dbo.getMessageHistory
    @ConversationID INT = 0
AS
    SET NOCOUNT ON;
    SELECT SenderRole, Message, Sent_Datetime FROM Messages
    WHERE ConversationID = @ConversationID
    ORDER BY Sent_Datetime
GO

CREATE OR ALTER PROCEDURE dbo.insertUserMessage
    @ConversationID INT = 0,
    @Message nvarchar(MAX) = NULL
AS
    SET NOCOUNT ON;
    INSERT INTO Messages(ConversationID, SenderRole, Message, Sent_Datetime)
    VALUES (@ConversationID, 'User', @Message, GETDATE());
GO

CREATE OR ALTER PROCEDURE dbo.insertAssistantMessage
    @ConversationID INT = 0,
    @Message nvarchar(MAX) = NULL
AS
    SET NOCOUNT ON;
    INSERT INTO Messages(ConversationID, SenderRole, Message, Sent_Datetime)
    VALUES (@ConversationID, 'Assistant', @Message, GETDATE());
GO
