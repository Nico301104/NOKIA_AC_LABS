from backend.app.database import SessionLocal
from backend.app.models import User
from backend.app.auth import get_password_hash

db = SessionLocal()

password = "admin123"
hashed_password = get_password_hash(password)

new_user = User(
    FullName="testuser",
    Email="testuser@example.com",
    Team="Team2",
    hashed_password=hashed_password,

)

db.add(new_user)
db.commit()
db.refresh(new_user)

print(f"User created with ID: {new_user.UserID}")