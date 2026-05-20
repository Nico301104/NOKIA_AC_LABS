--1. Crearea tabelului pentru Echipe
CREATE TABLE Teams (
    TeamID INT PRIMARY KEY IDENTITY(1,1),
    TeamName VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Crearea tabelului pentru Utilizatori/Angajați
CREATE TABLE Users (
    UserID INT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL UNIQUE,
    Email VARCHAR(100),
    HashedPassword VARCHAR(255) NOT NULL,
    Team VARCHAR(50) NOT NULL, -- Legatura catre tabela Teams
    Role VARCHAR(20) 
        CHECK (Role IN ('Admin', 'User', 'Manager', 'Support')),
    FOREIGN KEY (Team) REFERENCES Teams(TeamName)
);

-- 3. Crearea tabelului principal de Tickete
CREATE TABLE INCIDENT_TICKETS (
    Ticket_Number VARCHAR(20) PRIMARY KEY, 
    
    Status VARCHAR(30)
        CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Waiting for Customer')),
    
    Priority VARCHAR(10) 
        CHECK (Priority IN ('High', 'Medium', 'Low', 'Critical')),
    
    Company VARCHAR(100),
    Project VARCHAR(100),
    Team VARCHAR(50), -- Legatura catre tabela Teams
    Assigned_Person VARCHAR(100), -- Legatura catre tabela Users
    Service VARCHAR(100),
    Description TEXT,
    Notes TEXT,
    Resolution TEXT,

    Cat_T1 VARCHAR(50), 
    Cat_T2 VARCHAR(50), 
    Cat_T3 VARCHAR(50), 

    Submit_Datetime DATETIME DEFAULT GETDATE(),
    Resolved_Datetime DATETIME NULL,
    Closed_Datetime DATETIME NULL,
    Last_Modified DATETIME DEFAULT GETDATE(),
    Estimated_Resolution DATETIME NULL,

    Resolution_Category VARCHAR(50),
    Pending_Duration INT, 
    
    -- Chei externe
    FOREIGN KEY (Assigned_Person) REFERENCES Users(FullName),
    FOREIGN KEY (Team) REFERENCES Teams(TeamName)
);