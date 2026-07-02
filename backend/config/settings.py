from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Groq is the only LLM provider used in this project.
    # Set GROQ_API_KEY in the environment; leave unset to run in mock/offline mode.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "spotify-review-engine/1.0"
    chroma_persist_dir: str = "./data/chroma"
    data_dir: str = "./data"
    embedding_model: str = "all-MiniLM-L6-v2"
    top_k_retrieval: int = Field(default=20, ge=1)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def project_root(self) -> Path:
        return Path(__file__).resolve().parent.parent

    @property
    def data_path(self) -> Path:
        path = Path(self.data_dir)
        if not path.is_absolute():
            path = self.project_root / path
        return path

    @property
    def chroma_path(self) -> Path:
        path = Path(self.chroma_persist_dir)
        if not path.is_absolute():
            path = self.project_root / path
        return path

    @property
    def sample_data_path(self) -> Path:
        return self.data_path / "sample" / "play_store_sample.csv"

    def ensure_data_dirs(self) -> None:
        for subdir in ("sample", "processed", "chroma", "embeddings", "insights"):
            (self.data_path / subdir).mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_data_dirs()
    return settings
