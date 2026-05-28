USE ticketing;
GO

CREATE OR ALTER PROCEDURE dbo.GetPaginatedTickets
    @status VARCHAR(50) = NULL,
    @priority VARCHAR(50) = NULL,
    @team VARCHAR(100) = NULL
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
                WHEN 'TICKET_NUMBER' THEN Ticket_ID
                WHEN 'STATUS' THEN Status
                WHEN 'PRIORITY' THEN Priority
                WHEN 'COMPANY' THEN Company
                WHEN 'TEAM' THEN Team
                ELSE CONVERT(VARCHAR(50), Submit_Datetime, 120)
            END
        END ASC,

        CASE WHEN @sort_order = 'DESC' THEN 
            CASE @sort_by
                WHEN 'TICKET_NUMBER' THEN Ticket_ID
                WHEN 'STATUS' THEN Status
                WHEN 'PRIORITY' THEN Priority
                WHEN 'COMPANY' THEN Company
                WHEN 'TEAM' THEN Team
				ELSE CONVERT(VARCHAR(50), Submit_Datetime, 120)
			END
        END DESC

    OFFSET @skip ROWS
    FETCH NEXT @limit ROWS ONLY;

    --Finally, return the total count of tickets matching the filter criteria (with pagination applied)
    SELECT COUNT(*) AS total_items FROM INCIDENT_TICKETS t
    LEFT JOIN STATUSES s ON t.STATUS_ID = s.STATUS_ID
    LEFT JOIN PRIORITIES p ON t.PRIORITY_ID = p.PRIORITY_ID
    LEFT JOIN TEAMS tm ON t.TEAM_ID = tm.TEAM_ID
    WHERE (@status IS NULL OR s.STATUS_NAME = @status)
        AND (@priority IS NULL OR p.PRIORITY_NAME = @priority)
        AND (@team IS NULL OR tm.TEAM_NAME = @team)
    GROUP BY ISNULL(t.CATEGORY_TIER_3, 'Necunoscut')
    ORDER BY ticket_count DESC;
END;
GO