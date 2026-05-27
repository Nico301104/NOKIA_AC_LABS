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
    tickets = relationship('IncidentTicket', back_populates='company')

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
    tickets = relationship('IncidentTicket', back_populates='team')

    def __repr__(self):
        return f"<Team(id={self.team_id}, name='{self.team_name}')>"


class User(Base):
    __tablename__ = 'USERS'

    user_id = Column('USER_ID', Integer, primary_key=True, autoincrement=True)
    full_name = Column('FULL_NAME', String(100), nullable=False, unique=True)
    email = Column('EMAIL', String(100))
    team = Column('TEAM', String(100), ForeignKey('TEAMS.TEAM_NAME'))

    # Relații
    team_relationship = relationship('Team', back_populates='users')
    tickets = relationship('IncidentTicket', back_populates='assigned_user')

    def __repr__(self):
        return f"<User(id={self.user_id}, full_name='{self.full_name}', email='{self.email}')>"


class Status(Base):
    __tablename__ = 'STATUSES'

    status_id = Column('STATUS_ID', Integer, primary_key=True, autoincrement=True)
    status_name = Column('STATUS_NAME', String(50), nullable=False)

    # Relații
    tickets = relationship('IncidentTicket', back_populates='status')

    def __repr__(self):
        return f"<Status(id={self.status_id}, name='{self.status_name}')>"


class Priority(Base):
    __tablename__ = 'PRIORITIES'

    priority_id = Column('PRIORITY_ID', Integer, primary_key=True, autoincrement=True)
    priority_name = Column('PRIORITY_NAME', String(50), nullable=False)

    # Relații
    tickets = relationship('IncidentTicket', back_populates='priority')
    sla_configs = relationship('SlaConfig', back_populates='priority')

    def __repr__(self):
        return f"<Priority(id={self.priority_id}, name='{self.priority_name}')>"


class Ticket(Base):
    __tablename__ = 'INCIDENT_TICKETS'

    ticket_number = Column('TICKET_NUMBER', String(50), primary_key=True)
    company_id = Column('COMPANY_ID', Integer, ForeignKey('COMPANIES.COMPANY_ID'))
    team_id = Column('TEAM_ID', Integer, ForeignKey('TEAMS.TEAM_ID'))
    status_id = Column('STATUS_ID', Integer, ForeignKey('STATUSES.STATUS_ID'))
    priority_id = Column('PRIORITY_ID', Integer, ForeignKey('PRIORITIES.PRIORITY_ID'))
    project = Column('PROJECT', String(100))
    assigned_person = Column('ASSIGNED_PERSON', String(100), ForeignKey('USERS.FULL_NAME'))
    service = Column('SERVICE', String(100))
    description = Column('DESCRIPTION', Text)
    notes = Column('NOTES', Text)
    resolution = Column('RESOLUTION', Text)
    category_tier_1 = Column('CATEGORY_TIER_1', String(100))
    category_tier_2 = Column('CATEGORY_TIER_2', String(100))
    category_tier_3 = Column('CATEGORY_TIER_3', String(100))
    submit_datetime = Column('SUBMIT_DATETIME', DateTime)
    resolved_datetime = Column('RESOLVED_DATETIME', DateTime)
    closed_datetime = Column('CLOSED_DATETIME', DateTime)
    last_modified_datetime = Column('LAST_MODIFIED_DATETIME', DateTime)
    estimated_resolution_datetime = Column('ESTIMATED_RESOLUTION_DATETIME', DateTime)
    resolution_category = Column('RESOLUTION_CATEGORY', String(100))
    pending_duration = Column('PENDING_DURATION', Integer)

    # Relații
    company = relationship('Company', back_populates='tickets')
    team = relationship('Team', back_populates='tickets')
    status = relationship('Status', back_populates='tickets')
    priority = relationship('Priority', back_populates='tickets')
    assigned_user = relationship('User', back_populates='tickets')

    def __repr__(self):
        return f"<IncidentTicket(number='{self.ticket_number}', status_id={self.status_id}, priority_id={self.priority_id})>"


class SlaConfig(Base):
    __tablename__ = 'SLA_CONFIG'

    sla_id = Column('SLA_ID', Integer, primary_key=True, autoincrement=True)
    priority_id = Column('PRIORITY_ID', Integer, ForeignKey('PRIORITIES.PRIORITY_ID'), nullable=False)
    sla_hours = Column('SLA_HOURS', Integer, nullable=False)

    # Relații
    priority = relationship('Priority', back_populates='sla_configs')

    def __repr__(self):
        return f"<SlaConfig(id={self.sla_id}, priority_id={self.priority_id}, hours={self.sla_hours})>"