from sqlalchemy import Column, Integer, String, ForeignKey
from .database import Base

# SQLAlchemy models 

class User(Base):
    __tablename__ = "Users"
    
    UserID = Column(Integer, primary_key=True)
    FullName = Column(String(100), unique=True, nullable=False) 
    Email = Column(String(100))
    Team = Column(String(50), nullable=False)
    
    hashed_password = Column(String(255), nullable=False)
    Role = Column(String(50), default="user")