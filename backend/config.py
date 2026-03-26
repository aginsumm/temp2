from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "非遗知识图谱平台"
    DEBUG: bool = True
    
    DATABASE_URL: str = "postgresql://user:change_me@localhost:5432/heritage"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "change_me"
    
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530
    
    DASHSCOPE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    BAIDU_API_KEY: Optional[str] = None
    BAIDU_SECRET_KEY: Optional[str] = None
    
    JWT_SECRET: str = "change_me_to_a_strong_random_secret_key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 3600
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
