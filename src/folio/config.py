from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FOLIO_", env_file=".env", extra="ignore")
    model: str = "deepseek-flash"
    base_url: str = "https://api.deepseek.com"
    api_key: str = ""
    data_dir: Path = Path("data")
    max_steps: int = 40
    model_timeout: int = 60
    max_upload_bytes: int = 20 * 1024 * 1024
