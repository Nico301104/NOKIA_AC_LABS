import sqlite3
conn=sqlite3.connect("backend/test.db")
cur=conn.cursor()
print('tables:', cur.execute('SELECT name FROM sqlite_master WHERE type="table"').fetchall())
for table in ['Users','Teams','INCIDENT_TICKETS']:
    try:
        print(table, cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
    except Exception as e:
        print(table, 'error', e)
try:
    print('users:', cur.execute('SELECT UserID, FullName, Email, Team, Role FROM Users').fetchall())
except Exception as e:
    print('select error', e)
conn.close()