import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Company(Base):
    __tablename__ = 'COMPANIES'

    company_id = Column('COMPANY_ID', Integer, primary_key=True, autoincrement=True)
    company_name = Column('COMPANY_NAME', String(100), nullable=False)

    # Relații
    teams = relationship('Team', back_populates='company', cascade='all, delete-orphan')
    tickets = relationship('IncidentTicket', back_populates='company')  # Legat de IncidentTicket

    def __repr__(self):
        return f"<Company(id={self.company_id}, name='{self.company_name}')>"


class Team(Base):
    __tablename__ = 'TEAMS'

    team_id = Column('TEAM_ID', Integer, primary_key=True, autoincrement=True)
    team_name = Column('TEAM_NAME', String(100), nullable=False, unique=True)
    company_id = Column('COMPANY_ID', Integer, ForeignKey('COMPANIES.COMPANY_ID'))

    # Relații
    company = relationship('Company', back_populates='teams')
    users = relationship('User', back_populates='team_relationship')
    tickets = relationship('IncidentTicket', back_populates='team')  # Legat de IncidentTicket

    def __repr__(self):
        return f"<Team(id={self.team_id}, name='{self.team_name}')>"


class User(Base):
    __tablename__ = 'USERS'

    User_id = Column('USER_ID', Integer, primary_key=True, autoincrement=True)
    FullName = Column('FULL_NAME', String(100), nullable=False, unique=True)
    Email = Column('EMAIL', String(100))
    Team = Column('TEAM', String(100), ForeignKey('TEAMS.TEAM_NAME'))
    hashed_password = Column('HASHED_PASSWORD', String(255), nullable=True)  # Păstrat perfect!

    # Relații
    team_relationship = relationship('Team', back_populates='users')
    tickets = relationship('IncidentTicket', back_populates='assigned_user')  # Legat de IncidentTicket

    def __repr__(self):
        return f"<User(id={self.User_id}, full_name='{self.FullName}', email='{self.Email}')>"


class Status(Base):
    __tablename__ = 'STATUSES'

    status_id = Column('STATUS_ID', Integer, primary_key=True, autoincrement=True)
    status_name = Column('STATUS_NAME', String(50), nullable=False)

    # Relații
    tickets = relationship('IncidentTicket', back_populates='status')  # Legat de IncidentTicket

    def __repr__(self):
        return f"<Status(id={self.status_id}, name='{self.status_name}')>"


class Priority(Base):
    __tablename__ = 'PRIORITIES'

    priority_id = Column('PRIORITY_ID', Integer, primary_key=True, autoincrement=True)
    priority_name = Column('PRIORITY_NAME', String(50), nullable=False)

    # Relații
    tickets = relationship('IncidentTicket', back_populates='priority')  # Legat de IncidentTicket
    sla_configs = relationship('SlaConfig', back_populates='priority')

    def __repr__(self):
        return f"<Priority(id={self.priority_id}, name='{self.priority_name}')>"


class IncidentTicket(Base):  # Redenumit din Ticket în IncidentTicket ca să se pupe cu erorile din consolă
    __tablename__ = 'INCIDENT_TICKETS'

    Ticket_Number = Column('TICKET_NUMBER', String(50), primary_key=True)
    company_id = Column('COMPANY_ID', Integer, ForeignKey('COMPANIES.COMPANY_ID'))
    team_id = Column('TEAM_ID', Integer, ForeignKey('TEAMS.TEAM_ID'))
    status_id = Column('STATUS_ID', Integer, ForeignKey('STATUSES.STATUS_ID'))
    priority_id = Column('PRIORITY_ID', Integer, ForeignKey('PRIORITIES.PRIORITY_ID'))
    
    Project = Column('PROJECT', String(100))
    Assigned_Person = Column('ASSIGNED_PERSON', String(100), ForeignKey('USERS.FULL_NAME'))
    Service = Column('SERVICE', String(100))
    Description = Column('DESCRIPTION', Text)
    Notes = Column('NOTES', Text)
    Resolution = Column('RESOLUTION', Text)
    
    Cat_T1 = Column('CATEGORY_TIER_1', String(100))
    Cat_T2 = Column('CATEGORY_TIER_2', String(100))
    Cat_T3 = Column('CATEGORY_TIER_3', String(100))
    
    Submit_Datetime = Column('SUBMIT_DATETIME', DateTime)
    Resolved_Datetime = Column('RESOLVED_DATETIME', DateTime)
    Closed_Datetime = Column('CLOSED_DATETIME', DateTime)
    Last_Modified = Column('LAST_MODIFIED_DATETIME', DateTime)
    Estimated_Resolution = Column('ESTIMATED_RESOLUTION_DATETIME', DateTime)
    
    Resolution_Category = Column('RESOLUTION_CATEGORY', String(100))
    Pending_Duration = Column('PENDING_DURATION', Integer)

    # Relații
    company = relationship('Company', back_populates='tickets')
    team = relationship('Team', back_populates='tickets')
    status = relationship('Status', back_populates='tickets')
    priority = relationship('Priority', back_populates='tickets')
    assigned_user = relationship('User', back_populates='tickets')

    def __repr__(self):
        return f"<IncidentTicket(number='{self.Ticket_Number}', status_id={self.status_id}, priority_id={self.priority_id})>"


class SlaConfig(Base):
    __tablename__ = 'SLA_CONFIG'

    sla_id = Column('SLA_ID', Integer, primary_key=True, autoincrement=True)
    priority_id = Column('PRIORITY_ID', Integer, ForeignKey('PRIORITIES.PRIORITY_ID'), nullable=False)
    sla_hours = Column('SLA_HOURS', Integer, nullable=False)

    # Relații
    priority = relationship('Priority', back_populates='sla_configs')

    def __repr__(self):
        return f"<SlaConfig(id={self.sla_id}, priority_id={self.priority_id}, hours={self.sla_hours})>"