from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..models import User
from ..auth import get_current_user


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.get("/my-team")
def get_my_team_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = text("""
        SELECT
            FULL_NAME AS FullName,
            EMAIL AS Email,
            TEAM AS Team,
            IS_TEAM_ADMIN AS IsTeamAdmin
        FROM USERS
        WHERE TEAM = :team
        ORDER BY FULL_NAME
    """)

    result = db.execute(query, {"team": current_user.Team})
    users = result.mappings().all()

    return {
        "team": current_user.Team,
        "users": [dict(user) for user in users]
    }