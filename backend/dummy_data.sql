INSERT INTO TEAMS (id, name) 
VALUES
(1, 'Support'),
(2, 'Network'),
(3, 'Frontend'),
(4, 'Data'),
(5, 'DevOps'),
(6, 'Backend');

INSERT INTO USERS (id, full_name, email, team)
VALUES
(1, 'Popescu Ion', 'ion.popescu@gmail.com', 'Support'),
(2, 'Ionescu Maria', 'maria.ionescu@gmail.com', 'Network'),
(3, 'Georgescu Oana', 'oana.georgescu@gmail.com', 'Frontend'),
(4, 'Vasilescu Dan', 'dan.vasilescu@gmail.com', 'Data'),
(5, 'Popa Elena', 'elena.popa@gmail.com', 'Support'),
(6, 'Radu Mihai', 'mihai.radu@gmail.com', 'Frontend'),
(7, 'Enache Paul', 'paul.enache@gmail.com', 'Backend'),
(8, 'Marin Sorin', 'sorin.marin@gmail.com', 'DevOps'),
(9, 'Ilie Cristina', 'cristina.ilie@gmail.com', 'Data'),
(10, 'Tudor Alex', 'alex.tudor@gmail.com', 'Support');

INSERT INTO INCIDENT_TICKETS (
    Ticket_Number, 
    Status, 
    Priority, 
    Company, 
    Project, 
    Team, 
    Assigned_Person, 
    Service, 
    Description, 
    Notes, 
    Resolution, 
    Cat_T1, 
    Cat_T2, 
    Cat_T3,
    Resolved_Datetime,
    Closed_Datetime,
    Estimated_Resolution,
    Resolution_Category,
    Pending_Duration
    )
VALUES
('INC0001', 'Open', 'High', 'Vodafone', 'Billing', 'Support', 'Popescu Ion', 'API', 'API 500 error', NULL, NULL, 'App', 'Backend', 'API Error', NULL, NULL, '2026-03-20 14:00:00', NULL, 0)
