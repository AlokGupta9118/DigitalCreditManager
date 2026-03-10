from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str = "Ak"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 12
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "credit_ai"

    groq_api_key: str | None = None
    groq_model: str | None = None
    tavily_api_key: str | None = None

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()