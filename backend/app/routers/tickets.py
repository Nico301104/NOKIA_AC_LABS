from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, select, case
from typing import Literal
import math
import io
import pandas as pd
from openpyxl.styles import Font

from ..database import get_db, engine
from ..models import Ticket, User
from ..schemas import PaginatedTickets
from ..auth import get_current_user

# Router for handling ticket-related endpoints

router = APIRouter(
    prefix="/tickets",
    tags=["Tickets"]
)


def _build_xlsx_bytes(df: pd.DataFrame) -> bytes:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="tickets", index=False)
        worksheet = writer.book["tickets"]

        for cell in worksheet[1]:
            cell.font = Font(bold=True)

        for idx, column in enumerate(df.columns, start=1):
            max_len = len(str(column))
            for value in df[column]:
                value_len = len(str(value)) if value is not None else 0
                if value_len > max_len:
                    max_len = value_len
            worksheet.column_dimensions[worksheet.cell(row=1, column=idx).column_letter].width = max_len + 2

        worksheet.freeze_panes = "A2"

    output.seek(0)
    return output.getvalue()


# Endpoint to retrieve a paginated list of tickets with sorting options
@router.get("/", response_model=PaginatedTickets)
def get_tickets(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, description="Number of items per page (10, 25 or 50)"),
    sort_by: Literal["Submit_Datetime", "Priority", "Status"] = Query("Submit_Datetime", description="Field to sort by"),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort order (ascending or descending)"),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket)

    if sort_by == "Priority":
        priority_order = case(
            (Ticket.Priority == "Critical", 1),
            (Ticket.Priority == "High", 2),
            (Ticket.Priority == "Medium", 3),
            (Ticket.Priority == "Low", 4),
            else_=5
        )
        column_to_sort = priority_order
    else:
        column_to_sort = getattr(Ticket, sort_by)

    if sort_order == "asc":
        query = query.order_by(asc(column_to_sort))
    else:
        query = query.order_by(desc(column_to_sort))

    total_items = query.count()

    skip = (page - 1) * limit
    tickets = query.offset(skip).limit(limit).all()

    total_pages = math.ceil(total_items / limit) if total_items > 0 else 1

    return {
        "items": tickets,
        "total": total_items,
        "page": page,
        "pages": total_pages
    }


@router.get("/export")
def export_tickets(
    format: Literal["csv", "xlsx"] = Query("csv", description="Export format: csv or xlsx"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all tickets as CSV or XLSX (authenticated)."""
    stmt = select(Ticket.__table__)
    df = pd.read_sql(stmt, con=engine)

    if format == "xlsx":
        xlsx_data = _build_xlsx_bytes(df)
        headers = {"Content-Disposition": "attachment; filename=tickets.xlsx"}
        return StreamingResponse(
            io.BytesIO(xlsx_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )

    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_data = csv_buffer.getvalue()
    csv_buffer.close()

    headers = {"Content-Disposition": "attachment; filename=tickets.csv"}
    return StreamingResponse(iter([csv_data]), media_type="text/csv", headers=headers)
