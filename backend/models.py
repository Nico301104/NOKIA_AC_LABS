from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from database import Base

class Team(Base):
    __tablename__ = "Teams"
    TeamID = Column(Integer, primary_key=True, index=True)
    TeamName = Column(String(50), unique=True, nullable=False)

class User(Base):
    __tablename__ = "Users"
    UserID = Column(Integer, primary_key=True)
    FullName = Column(String(100), unique=True, nullable=False)
    Email = Column(String(100))
    Team = Column(String(50), ForeignKey("Teams.TeamName"), nullable=False)

class Ticket(Base):
    __tablename__ = "INCIDENT_TICKETS"
    
    Ticket_Number = Column(String(20), primary_key=True)
    Status = Column(String(30))
    Priority = Column(String(10))
    Company = Column(String(100))
    Project = Column(String(100))
    Team = Column(String(50), ForeignKey("Teams.TeamName"))
    Assigned_Person = Column(String(100), ForeignKey("Users.FullName"))
    Service = Column(String(100))
    Description = Column(Text)
    Notes = Column(Text)
    Resolution = Column(Text)
    
    # Categorii
    Cat_T1 = Column(String(50))
    Cat_T2 = Column(String(50))
    Cat_T3 = Column(String(50))
    
    # Timp și Date
    Submit_Datetime = Column(DateTime, default=datetime.utcnow)
    Resolved_Datetime = Column(DateTime, nullable=True)
    Closed_Datetime = Column(DateTime, nullable=True)
    Last_Modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    Estimated_Resolution = Column(DateTime, nullable=True)
    
    # Altele
    Resolution_Category = Column(String(50))
    Pending_Duration = Column(Integer)