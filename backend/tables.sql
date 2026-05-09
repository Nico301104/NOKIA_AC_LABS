--1. Crearea tabelului pentru Echipe
CREATE TABLE Teams (
    TeamID INT PRIMARY KEY IDENTITY(1,1),
    TeamName VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Crearea tabelului pentru Utilizatori/Angajați (pentru a avea referințe valide)
CREATE TABLE Users (
    UserID INT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL UNIQUE,
    Email VARCHAR(100),
    Team VARCHAR(50) NOT NULL,
    FOREIGN KEY (Team) REFERENCES Teams(TeamName)
);

-- 3. Crearea tabelului principal de Tickete
CREATE TABLE Tickets (
    Ticket_Number INT PRIMARY KEY, -- Folosim ID-ul din template-ul tău
    
    -- Statusul ticketului (Open, In Progress, Resolved, Closed, Waiting for Customer)
    Status VARCHAR(30)
        CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Waiting for Customer')),
    
    -- Prioritatea (High, Medium, Low)
    Priority VARCHAR(10) 
        CHECK (Priority IN ('High', 'Medium', 'Low', 'Critical')),
    
    Company VARCHAR(100),
    Project VARCHAR(100),
    Team VARCHAR(50),
    Assigned_Person VARCHAR(100), -- Legatura catre tabela Users
    Service VARCHAR(100),
    Description TEXT,
    Notes TEXT,
    Resolution TEXT,

    Cat_T1 VARCHAR(50), -- Categoria 1
    Cat_T2 VARCHAR(50), -- Categoria 2
    Cat_T3 VARCHAR(50), -- Categoria 3

    Submit_Datetime DATETIME DEFAULT GETDATE(),
    Resolved_Datetime DATETIME NULL,
    Closed_Datetime DATETIME NULL,
    Last_Modified DATETIME DEFAULT GETDATE(),
    Estimated_Resolution DATETIME NULL,

    Resolution_Category VARCHAR(50),
    Pending_Duration INT, 
    
    -- Chei externe pentru integritatea datelor
    FOREIGN KEY (Assigned_Person) REFERENCES Users(FullName),
    FOREIGN KEY (Team) REFERENCES Teams(TeamName)
);