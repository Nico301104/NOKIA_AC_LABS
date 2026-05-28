from pydantic import BaseModel, Field, field_serializer, AliasChoices
from datetime import datetime
from typing import List, Optional

# Pydantic models for request and response validation

class UserLogin(BaseModel):
    FullName: str = Field(validation_alias=AliasChoices("FullName", "fullName", "username"))
    Password: str = Field(validation_alias=AliasChoices("Password", "password"))

    model_config = {
        "populate_by_name": True
    }

class Token(BaseModel): #Model for token response
    access_token: str
    token_type: str
    expires_in: int = None

class UserOut(BaseModel): #Model for user output

    FullName: str = Field(alias="FullName")
    Team: str = Field(alias="Team")
    Role: str = Field(alias="Role", default="user")

    class Config:
        from_attributes = True
        validate_by_name = True
        
class TicketOut(BaseModel): #Model for ticket output
    Ticket_Number: str
    Status: Optional[str] = None
    Priority: Optional[str] = None
    Company: Optional[str] = None
    Project: Optional[str] = None
    Team: Optional[str] = None
    Assigned_Person: Optional[str] = None
    Service: Optional[str] = None
    Description: Optional[str] = None
    Notes: Optional[str] = None
    Resolution: Optional[str] = None

    # Categorii
    Cat_T1: Optional[str] = None
    Cat_T2: Optional[str] = None
    Cat_T3: Optional[str] = None

    # Timp și Date — stocate ca datetime, serializate ca ISO string
    Submit_Datetime: Optional[datetime] = None
    Resolved_Datetime: Optional[datetime] = None
    Closed_Datetime: Optional[datetime] = None
    Last_Modified: Optional[datetime] = None
    Estimated_Resolution: Optional[datetime] = None

    # Altele
    Resolution_Category: Optional[str] = None
    Pending_Duration: Optional[int] = None

    model_config = {"from_attributes": True}
        
class PaginatedTickets(BaseModel): #Model for paginated ticket response
    items: list[TicketOut]
    total: int
    page: int
    pages: int 