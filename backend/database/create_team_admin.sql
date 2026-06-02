USE ticketing;
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