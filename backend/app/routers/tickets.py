from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, select, case, text
from typing import Optional, Any, Literal
import math
import io
import pandas as pd
from typing import Literal
from ..database import get_db, engine
from ..models import IncidentTicket, User, Priority, Status

from ..schemas import PaginatedTickets, ChangeTicketStatusRequest, SelfAssignTicketRequest, AdminAssignTicketRequest
from ..auth import get_current_user

# Router for handling ticket-related endpoints

router = APIRouter(
    prefix="/tickets", # All routes in this router will be prefixed with /tickets
    tags=["Tickets"] # All routes in this router will be tagged as "Tickets" in Swagger UI
)


def map_row_to_ticket(row, col_map):
    return {
        "Ticket_Number": row[col_map.get("Ticket_ID")],
        "Description": row[col_map.get("Description")],
        "Status": row[col_map.get("Status")],
        "Priority": row[col_map.get("Priority")],
        "Company": row[col_map.get("Company")],
        "Team": row[col_map.get("Team")],
        "Project": row[col_map.get("Project")],
        "Assigned_Person": row[col_map.get("Assigned_Person")],
        "Service": row[col_map.get("Service")],
        "Submit_Datetime": row[col_map.get("Submit_Datetime")]
    }

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
                @limit = :limit,
                @priority = :priority,
                @sla_status = :sla_status,
                @sla_interval = :sla_interval,
                @category_tier_1 = :category_tier_1,
                @category_tier_2 = :category_tier_2,
                @category_tier_3 = :category_tier_3
        """)
    return db.execute(query, params)
  


# Endpoint to retrieve a paginated list of tickets with sorting and filtering options
@router.get("/", response_model=PaginatedTickets)
def get_tickets(
        page: int = 1,
        limit: int = Query(10, enum=[10, 25, 50]),
        sort_by: str = Query("SUBMIT_DATETIME", enum=["SUBMIT_DATETIME", "STATUS", "PRIORITY", "COMPANY", "TEAM"]),
        sort_order: str = Query("DESC", enum=["ASC", "DESC"]),
        search: Optional[str] = None,
        status: Optional[str] = None,
        team: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,

        # UPDATED: Added target endpoints to match parameter payload configurations passed from UI graphics
        priority: Optional[str] = None,
        sla_status: Optional[str] = None,
        sla_interval: Optional[str] = None,
        category_tier_1: Optional[str] = None,
        category_tier_2: Optional[str] = None,
        category_tier_3: Optional[str] = None,
        db: Session = Depends(get_db),
):
    skip = (page - 1) * limit

    params = {
        "search": search,
        "status": status,
        "team": team,
        "start_date": start_date,
        "end_date": end_date,
        "sort_by": sort_by,
        "sort_order": sort_order,
        "skip": skip,
        "limit": limit,
        "priority": priority,
        "sla_status": sla_status,
        "sla_interval": sla_interval,
        "category_tier_1": category_tier_1,
        "category_tier_2": category_tier_2,
        "category_tier_3": category_tier_3
    }

    # Use context management to guarantee immediate closure of raw driver cursors
    query = text("""
            EXEC dbo.GetPaginatedTickets
                @search = :search, @status = :status, @team = :team,
                @start_date = :start_date, @end_date = :end_date,
                @sort_by = :sort_by, @sort_order = :sort_order,
                @skip = :skip, @limit = :limit, @priority = :priority,
                @sla_status = :sla_status, @sla_interval = :sla_interval,
                @category_tier_1 = :category_tier_1, @category_tier_2 = :category_tier_2,
                @category_tier_3 = :category_tier_3
        """)

    formatted_items = []
    total_items = 0

    # Native connection context handling prevents pooling lockups
    with db.get_bind().connect() as conn:
        result = conn.execute(query, params)
        raw_cursor = result.cursor

        if raw_cursor:
            # Optimize lookups using an index map rather than manual zip loops
            if raw_cursor.description:
                col_map = {col[0]: idx for idx, col in enumerate(raw_cursor.description)}
                db_rows = raw_cursor.fetchall()
                formatted_items = [map_row_to_ticket(row, col_map) for row in db_rows]

            # Switch to second select result cleanly
            if raw_cursor.nextset():
                count_row = raw_cursor.fetchone()
                if count_row:
                    total_items = count_row[0]

    total_pages = math.ceil(total_items / limit) if total_items > 0 else 1

    return {
        "items": formatted_items,
        "total": total_items,
        "page": page,
        "pages": total_pages
    }
    

@router.get("/teams")
def get_teams(db: Session = Depends(get_db)):
    query = text("""
                SELECT TEAM_NAME FROM dbo.TEAMS
                WHERE TEAM_NAME IS NOT NULL
                ORDER BY TEAM_NAME""")
    
    result = db.execute(query)
    teams_list = [row[0] for row in result.fetchall()]
    return teams_list


@router.get("/companies")
def get_companies(db: Session = Depends(get_db)):
    query = text("""
                SELECT COMPANY_NAME FROM dbo.COMPANIES
                WHERE COMPANY_NAME IS NOT NULL
                ORDER BY COMPANY_NAME""")
    
    result = db.execute(query)
    companies_list = [row[0] for row in result.fetchall()]
    return companies_list

@router.get("/statuses")
def get_statuses(db: Session = Depends(get_db)):
    query = text("""
                SELECT STATUS_NAME FROM dbo.STATUSES
                WHERE STATUS_NAME IS NOT NULL
                ORDER BY STATUS_NAME""")
    
    result = db.execute(query)
    statuses_list = [row[0] for row in result.fetchall()]
    return statuses_list

@router.get("/priorities")
def get_priorities(db: Session = Depends(get_db)):
    query = text("""
                SELECT PRIORITY_NAME FROM dbo.PRIORITIES
                WHERE PRIORITY_NAME IS NOT NULL
                ORDER BY PRIORITY_NAME""")
    
    result = db.execute(query)
    priorities_list = [row[0] for row in result.fetchall()]
    return priorities_list                


@router.get("/export")
def export_tickets(
    format: Literal["csv", "xlsx"] = Query("csv", description="Export format: csv or xlsx"),
    priority: str | None = Query(None),
    status: str | None = Query(None),
    assigned_person: str | None = Query(None),
    sort_by: Literal["submit_datetime", "priority", "status"] = Query("submit_datetime"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(IncidentTicket)\
        .join(Priority, IncidentTicket.priority_id == Priority.priority_id)\
        .join(Status, IncidentTicket.status_id == Status.status_id)

    # Apply filters
    if priority and priority != "All":
        query = query.filter(Priority.priority_name == priority)

    if status and status != "All":
        query = query.filter(Status.status_name == status)

    if assigned_person and assigned_person != "All":
        query = query.filter(IncidentTicket.Assigned_Person == assigned_person)

    # Apply sorting
    if sort_by == "priority":
        priority_order = case(
            (Priority.priority_name == "Critical", 1),
            (Priority.priority_name == "High", 2),
            (Priority.priority_name == "Medium", 3),
            (Priority.priority_name == "Low", 4),
            else_=5
        )
        column_to_sort = priority_order
    elif sort_by == "status":
        column_to_sort = Status.status_name
    else:
        column_to_sort = IncidentTicket.Submit_Datetime

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



@router.patch("/{ticket_number}/status")
def change_ticket_status(
    ticket_number: str,
    payload: ChangeTicketStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        db.execute(
            text("""
                EXEC dbo.sp_ChangeTicketStatus
                    @TicketNumber = :ticket_number,
                    @NewStatusId = :new_status_id
            """),
            {
                "ticket_number": ticket_number,
                "new_status_id": payload.NewStatusId,
            },
        )
        db.commit()

        return {
            "message": "Ticket status updated successfully",
            "ticket_number": ticket_number,
            "new_status_id": payload.NewStatusId,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))



@router.post("/{ticket_number}/self-assign")
def self_assign_ticket(
    ticket_number: str,
    payload: SelfAssignTicketRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        db.execute(
            text("""
                EXEC dbo.sp_SelfAssignTicket
                    @TicketNumber = :ticket_number,
                    @UserFullName = :user_full_name
            """),
            {
                "ticket_number": ticket_number,
                "user_full_name": payload.UserFullName,
            },
        )
        db.commit()

        return {
            "message": "Ticket self-assigned successfully",
            "ticket_number": ticket_number,
            "assigned_person": payload.UserFullName,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))



@router.post("/{ticket_number}/admin-assign")
def admin_assign_ticket(
    ticket_number: str,
    payload: AdminAssignTicketRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        db.execute(
            text("""
                EXEC dbo.sp_AdminAssignTicket
                    @TicketNumber = :ticket_number,
                    @AdminFullName = :admin_full_name,
                    @TargetUserFullName = :target_user_full_name
            """),
            {
                "ticket_number": ticket_number,
                "admin_full_name": payload.AdminFullName,
                "target_user_full_name": payload.TargetUserFullName,
            },
        )
        db.commit()

        return {
            "message": "Ticket assigned by admin successfully",
            "ticket_number": ticket_number,
            "admin": payload.AdminFullName,
            "assigned_person": payload.TargetUserFullName,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))