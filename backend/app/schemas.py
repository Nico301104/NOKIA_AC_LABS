from pydantic import BaseModel, Field

# Pydantic models for request and response validation

class UserLogin(BaseModel): #Model for user login request
    username: str 
    password: str

class Token(BaseModel): #Model for token response
    access_token: str
    token_type: str
    expires_in: int = None

class UserOut(BaseModel): #Model for user output

    username: str = Field(alias="FullName")
    role: str = Field(alias="Role")
    team: str = Field(alias="Team")

    class Config:
        from_attributes = True
        populate_by_name = True