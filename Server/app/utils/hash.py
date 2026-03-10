import bcrypt
from passlib.context import CryptContext

# Option 1: Use passlib with proper configuration
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Add this to fix the issue
)

def hash_password(password: str) -> str:
    # Truncate password if longer than 72 bytes (bcrypt limitation)
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Truncate password if longer than 72 bytes
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)


# Option 2: Use bcrypt directly (even more reliable)
"""
import bcrypt

def hash_password(password: str) -> str:
    # Truncate password if longer than 72 bytes
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Truncate password if longer than 72 bytes
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password[:72]
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )
"""