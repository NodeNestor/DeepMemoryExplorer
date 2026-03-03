"""Configuration -- env defaults + mutable runtime config."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    hivemind_url: str = "http://localhost:8100"
    llm_api_url: str = "http://localhost:8989/v1"
    llm_model: str = "Qwen/Qwen3.5-0.8B"
    llm_api_key: str = ""
    llm_max_tokens: int = 16384
    app_port: int = 3000
    agent_max_iterations: int = 10


settings = Settings()


class RuntimeConfig:
    """Mutable config that can be changed at runtime via Settings page.

    Initialized from env-based Settings, overridable via API.
    """

    def __init__(self) -> None:
        self.hivemind_url: str = settings.hivemind_url
        self.llm_api_url: str = settings.llm_api_url
        self.llm_model: str = settings.llm_model
        self.llm_api_key: str = settings.llm_api_key
        self.llm_max_tokens: int = settings.llm_max_tokens
        self.agent_max_iterations: int = settings.agent_max_iterations

    def update(self, **kwargs: object) -> None:
        for k, v in kwargs.items():
            if hasattr(self, k) and v is not None:
                setattr(self, k, v)


runtime_config = RuntimeConfig()
