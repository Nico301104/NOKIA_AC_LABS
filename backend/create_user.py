from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

db = SessionLocal()

# SPECIFICĂ AICI DATELE UTILIZATORULUI EXISTENT:
nume_utilizator = "Popescu Ion"  # Numele exact din dummy_data.sql
parola_noua = "nokia123" # Parola pe care o va introduce pe site

user = db.query(User).filter(User.FullName == nume_utilizator).first()

if user:
    user.hashed_password = get_password_hash(parola_noua)
    
    try:
        db.commit()
        print(f"Succes! Utilizatorului '{nume_utilizator}' i s-a atribuit parola.")
        print(f"Acum se poate conecta pe site cu numele '{nume_utilizator}' și parola aleasă.")
    except Exception as e:
        db.rollback()
        print(f"Eroare la salvare: {e}")
else:
    print(f"Eroare: Utilizatorul '{nume_utilizator}' nu a fost găsit!")

db.close()