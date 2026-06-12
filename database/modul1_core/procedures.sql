USE ticketing;
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