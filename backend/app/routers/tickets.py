from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, select, case, text
from typing import Optional, Any
import math
import io
import pandas as pd

from ..database import get_db, engine
from ..models import User, IncidentTicket as Ticket
from ..schemas import PaginatedTickets
from ..auth import get_current_user

# Router for handling ticket-related endpoints

router = APIRouter(
    prefix="/tickets", # All routes in this router will be prefixed with /tickets
    tags=["Tickets"] # All routes in this router will be tagged as "Tickets" in Swagger UI
)

def exec_tickets_procedure(db: Session, params: dict[str, Any]):
    query = text("""
        EXEC dbo.GetPaginatedTickets
            @search = :search,
            @status = :status,
            @team = :team,
            @start_date = :start_date,
            @end_date = :end_date,
            @sort_by = :sort_by,
            @sort_order = :sort_order,
            @skip = :skip,
            @limit = :limit
    """)
    return db.execute(query, params)
  


# Endpoint to retrieve a paginated list of tickets with sorting and filtering options
@router.get("/", response_model=PaginatedTickets)
def get_tickets(
    page: int = 1,
    limit: int = Query(10, enum = [10, 25, 50]),
    sort_by: str = Query("SUBMIT_DATETIME", enum = ["SUBMIT_DATETIME", "STATUS", "PRIORITY", "COMPANY", "TEAM"]),
    sort_order: str = Query("DESC", enum = ["ASC", "DESC"]),
    search: Optional[str] = None,
    status: Optional[str] = None,
    team: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    
    query = text("""
        EXEC dbo.GetPaginatedTickets
            @search = :search,
            @status = :status,
            @team = :team,
            @start_date = :start_date,
            @end_date = :end_date,
            @sort_by = :sort_by,
            @sort_order = :sort_order,
            @skip = :skip,
            @limit = :limit
    """)
    
    params = {
        "search": search,
        "status": status,
        "team": team,
        "start_date": start_date,
        "end_date": end_date,
        "sort_by": sort_by,
        "sort_order": sort_order,
        "skip": skip,
        "limit": limit
    }
    
    result = db.execute(query, params)
    db_rows = result.fetchall()
    formatted_items = []
    
    for row in db_rows:
        r = dict(row._mapping)
        formatted_items.append({
            "Ticket_Number": r.get("Ticket_ID"),
            "Description": r.get("Description"),
            "Status": r.get("Status"),
            "Priority": r.get("Priority"),
            "Company": r.get("Company"),
            "Team": r.get("Team"),
            "Submit_Datetime": r.get("Submit_Datetime")
        })
   
   
    total_items = 0
    cursor = result.cursor
    if cursor and cursor.nextset():
        count_row = cursor.fetchone()
        if count_row:
            total_items = count_row[0]

    total_pages = math.ceil(total_items / limit) if total_items > 0 else 1

    return {
        "items": formatted_items,
        "total": total_items,
        "page": page,
        "pages": total_pages
    }
 


@router.get("/export")
def export_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Export all tickets as CSV (authenticated).

    Returns a StreamingResponse with Content-Disposition header so browsers download `tickets.csv`.
    """
    # Build a SELECT for the tickets table and load into a DataFrame using the engine
    stmt = select(Ticket.__table__)
    df = pd.read_sql(stmt, con=engine)

    # Ensure CSV contains all columns and use default formatting
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_data = csv_buffer.getvalue()
    csv_buffer.close()

    headers = {"Content-Disposition": "attachment; filename=tickets.csv"}
    return StreamingResponse(iter([csv_data]), media_type="text/csv", headers=headers)
