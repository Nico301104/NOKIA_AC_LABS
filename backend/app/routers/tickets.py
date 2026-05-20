from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, select
from typing import Literal
import math
import io
import pandas as pd

from ..database import get_db, engine
from ..models import Ticket, User
from ..schemas import PaginatedTickets
from ..auth import get_current_user

# Router for handling ticket-related endpoints

router = APIRouter(
    prefix="/tickets", # All routes in this router will be prefixed with /tickets
    tags=["Tickets"] # All routes in this router will be tagged as "Tickets" in Swagger UI
)

# Endpoint to retrieve a paginated list of tickets with sorting options
@router.get("/", response_model=PaginatedTickets)
def get_tickets(
    page: int = Query(1, ge=1, description="Page number"),
    limit: Literal[10, 25, 50]= Query(10, description="Number of items per page"),
    sort_by: Literal["Submit_Datetime","Priority", "Status"] = Query("Submit_Datetime", description="Field to sort by"),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort order (ascending or descending)"),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket) # Start a query on the Ticket model to retrieve all tickets from the database
    column_to_sort = getattr(Ticket, sort_by) # Get the column to sort by based on the sort_by parameter (Submit_Datetime, Priority, or Status)
    
    if sort_order == "asc":
        query = query.order_by(asc(column_to_sort))
    else:
        query = query.order_by(desc(column_to_sort))
        
    total_items = query.count()
    
    skip = (page - 1) * limit # Calculate how many items to skip based on the current page and limit
    tickets = query.offset(skip).limit(limit).all() # Retrieve tickets for the current page by applying the offset and limit to the query
    
    total_pages = math.ceil(total_items / limit) if total_items > 0 else 1 # Calculate total pages based on total items and limit, ensuring at least 1 page if there are items
    
    # Return the paginated response with the list of tickets, total items, current page, and total pages
    return {
        "items": tickets,
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
