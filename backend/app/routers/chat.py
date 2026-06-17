from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from ..database import get_db

from .. import ai_service

router = APIRouter(tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    conversation_id: int
    user_id: int
    ticket_id: str


@router.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        # Initialize our dynamic variable with the request default
        active_conv_id = request.conversation_id

        # Check if the conversation exists (Only need to do this once!)
        existing = db.execute(text("EXEC getConversation :conv_id"), {
            "conv_id": request.conversation_id
        }).fetchone()

        if not existing:
            # Execute your procedure
            result = db.execute(text("EXEC createConversation :user_id, :ticket_id"), {
                "user_id": request.user_id,
                "ticket_id": request.ticket_id
            })

            # Fetch the newly generated ID directly from the procedure result stream
            new_id_row = result.fetchone()
            if new_id_row and new_id_row[0]:
                active_conv_id = int(new_id_row[0])

            db.commit()

        user_message = request.message

        sql_query = ai_service.get_sql_from_question(user_message)

        sql_upper = sql_query.strip().upper()
        if not (sql_upper.startswith("SELECT") or sql_upper.startswith("EXEC")):
            raise HTTPException(status_code=400, detail="Doar query-uri SELECT sunt permise!")

        result = db.execute(text(sql_query)).fetchall()
        sql_result = str(result)

        ai_response = ai_service.get_natural_response(user_message, sql_result)

        # FIXED: Now inserting using the database-verified active_conv_id!
        db.execute(text("EXEC insertUserMessage :conv_id, :message"), {
            "conv_id": active_conv_id,
            "message": user_message
        })
        db.execute(text("EXEC insertAssistantMessage :conv_id, :message"), {
            "conv_id": active_conv_id,
            "message": ai_response
        })

        db.commit()

        # FIXED: Returning active_conv_id so frontend can track it
        return {
            "conversation_id": active_conv_id,
            "user_message": user_message,
            "sql_query": sql_query,
            "sql_result": sql_result,
            "natural_response": ai_response
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(str(e))
        raise HTTPException(status_code=500, detail=f"Eroare: {str(e)}")


@router.get("/history/{conversation_id}")
def get_history(conversation_id: int, db: Session = Depends(get_db)):
    try:
        result = db.execute(text("EXEC getMessageHistory :conv_id"), {
            "conv_id": conversation_id
        }).fetchall()

        return [{"role": row[0].lower(), "text": row[1], "timestamp": row[2].isoformat() if row[2] else None} for row in result]
    except Exception as e:
        db.rollback()
        print(str(e))
        raise HTTPException(status_code=500, detail=f"Eroare: {str(e)}")