from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

# Pydantic models for request and response validation

class UserLogin(BaseModel): #Model for user login request
    FullName: str 
    password: str

class Token(BaseModel): #Model for token response
    access_token: str
    token_type: str
    expires_in: int = None

class UserOut(BaseModel): #Model for user output

    FullName: str = Field(alias="FullName")
    Team: str = Field(alias="Team")

    class Config:
        from_attributes = True
        validate_by_name = True
        
class TicketOut(BaseModel): #Model for ticket output
    Ticket_Number: str
    Status: str
    Priority: str
    Company: str
    Project: str
    Team: str
    Assigned_Person: str
    Service: str
    Description: str
    Notes: str
    Resolution: str
    
    # Categorii
    Cat_T1: str
    Cat_T2: str
    Cat_T3: str
    
    # Timp și Date
    Submit_Datetime: str
    Resolved_Datetime: str = None
    Closed_Datetime: str = None
    Last_Modified: str = None
    Estimated_Resolution: str = None
    
    # Altele
    Resolution_Category: str = None
    Pending_Duration: int = None

    class Config:
        from_attributes = True
        
class PaginatedTickets(BaseModel): #Model for paginated ticket response
    items: list[TicketOut]
    total: int
    page: int
    pages: int 