from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, select, case, text
from typing import Optional, Any
import math
import io
import pandas as pd
from typing import Literal

from ..database import get_db, engine
# 🌟 Corectat: Importăm IncidentTicket în loc de Ticket
from ..models import IncidentTicket, User
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
def export_tickets(
    format: Literal["csv", "xlsx"] = Query("csv", description="Export format: csv or xlsx"),
    priority: str | None = Query(None),
    status: str | None = Query(None),
    assigned_person: str | None = Query(None),
    sort_by: Literal["Submit_Datetime", "Priority", "Status"] = Query("Submit_Datetime"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export tickets as CSV or XLSX, using the same filters as the page."""

    query = db.query(IncidentTicket)

    # Apply filters
    if priority and priority != "All":
        query = query.filter(IncidentTicket.Priority == priority)

    if status and status != "All":
        query = query.filter(IncidentTicket.Status == status)

    if assigned_person and assigned_person != "All":
        query = query.filter(IncidentTicket.Assigned_Person == assigned_person)

    # Apply sorting
    if sort_by == "Priority":
        priority_order = case(
            (IncidentTicket.Priority == "Critical", 1),
            (IncidentTicket.Priority == "High", 2),
            (IncidentTicket.Priority == "Medium", 3),
            (IncidentTicket.Priority == "Low", 4),
            else_=5
        )
        column_to_sort = priority_order
    else:
        column_to_sort = getattr(IncidentTicket, sort_by)

    if sort_order == "asc":
        query = query.order_by(asc(column_to_sort))
    else:
        query = query.order_by(desc(column_to_sort))

    df = pd.read_sql(query.statement, con=engine)

    if format == "csv":
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        headers = {
            "Content-Disposition": "attachment; filename=tickets.csv"
        }

        return StreamingResponse(
            iter([csv_buffer.getvalue()]),
            media_type="text/csv",
            headers=headers
        )

    xlsx_buffer = io.BytesIO()

    with pd.ExcelWriter(xlsx_buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Tickets")

        worksheet = writer.sheets["Tickets"]

        # Header row bold
        for cell in worksheet[1]:
            cell.font = cell.font.copy(bold=True)

        # Freeze first row
        worksheet.freeze_panes = "A2"

        # Auto-adjust column widths
        for column_cells in worksheet.columns:
            max_length = 0
            column_letter = column_cells[0].column_letter

            for cell in column_cells:
                if cell.value is not None:
                    max_length = max(max_length, len(str(cell.value)))

            worksheet.column_dimensions[column_letter].width = min(max_length + 2, 50)

        worksheet.auto_filter.ref = worksheet.dimensions

    xlsx_buffer.seek(0)

    headers = {
        "Content-Disposition": "attachment; filename=tickets.xlsx"
    }

    return StreamingResponse(
        xlsx_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )