"""Multi-model LLM provider support.

Integrates patterns from Goose for supporting multiple LLM providers:
- Google Gemini (default)
- OpenAI (GPT-4, GPT-4o, GPT-3.5)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Local models (Ollama, LM Studio)

Enables cost optimization and fallback strategies.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()


class LLMProvider(str, Enum):
    """Supported LLM providers."""

    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    LM_STUDIO = "lm_studio"


@dataclass
class LLMConfig:
    """LLM configuration."""

    provider: LLMProvider
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 4096
    timeout: int = 60


@dataclass
class LLMCost:
    """LLM usage cost tracking."""

    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float
    model: str


class BaseLLMProvider(ABC):
    """Base class for LLM providers."""

    def __init__(self, config: LLMConfig):
        """Initialize provider.

        Args:
            config: LLM configuration
        """
        self.config = config

    @abstractmethod
    async def generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> str:
        """Generate text completion.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt

        Returns:
            Generated text
        """
        pass

    @abstractmethod
    def calculate_cost(self, input_tokens: int, output_tokens: int) -> LLMCost:
        """Calculate usage cost.

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Cost information
        """
        pass


class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider."""

    # Pricing per 1M tokens (as of 2026-01)
    PRICING = {
        "gemini-2.5-flash": {"input": 0.075, "output": 0.30},
        "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
        "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    }

    async def generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> str:
        """Generate using Gemini."""
        import google.generativeai as genai

        genai.configure(api_key=self.config.api_key or os.getenv("GOOGLE_API_KEY"))

        model = genai.GenerativeModel(
            model_name=self.config.model,
            generation_config={
                "temperature": self.config.temperature,
                "max_output_tokens": self.config.max_tokens,
            },
            system_instruction=system_prompt,
        )

        response = await model.generate_content_async(prompt)
        return response.text

    def calculate_cost(self, input_tokens: int, output_tokens: int) -> LLMCost:
        """Calculate Gemini cost."""
        pricing = self.PRICING.get(
            self.config.model, {"input": 0.10, "output": 0.40}
        )

        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]

        return LLMCost(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_usd=input_cost + output_cost,
            model=self.config.model,
        )


class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider."""

    # Pricing per 1M tokens (as of 2026-01)
    PRICING = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-4-turbo": {"input": 10.00, "output": 30.00},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    }

    async def generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> str:
        """Generate using OpenAI."""
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError("openai package not installed. Run: pip install openai")

        client = AsyncOpenAI(
            api_key=self.config.api_key or os.getenv("OPENAI_API_KEY"),
            base_url=self.config.base_url,
            timeout=self.config.timeout,
        )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
        )

        return response.choices[0].message.content

    def calculate_cost(self, input_tokens: int, output_tokens: int) -> LLMCost:
        """Calculate OpenAI cost."""
        pricing = self.PRICING.get(
            self.config.model, {"input": 2.50, "output": 10.00}
        )

        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]

        return LLMCost(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_usd=input_cost + output_cost,
            model=self.config.model,
        )


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude provider."""

    # Pricing per 1M tokens (as of 2026-01)
    PRICING = {
        "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
        "claude-3-opus-20240229": {"input": 15.00, "output": 75.00},
        "claude-3-sonnet-20240229": {"input": 3.00, "output": 15.00},
        "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
    }

    async def generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> str:
        """Generate using Anthropic Claude."""
        try:
            from anthropic import AsyncAnthropic
        except ImportError:
            raise ImportError(
                "anthropic package not installed. Run: pip install anthropic"
            )

        client = AsyncAnthropic(
            api_key=self.config.api_key or os.getenv("ANTHROPIC_API_KEY"),
            base_url=self.config.base_url,
            timeout=self.config.timeout,
        )

        response = await client.messages.create(
            model=self.config.model,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            system=system_prompt or "",
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text

    def calculate_cost(self, input_tokens: int, output_tokens: int) -> LLMCost:
        """Calculate Anthropic cost."""
        pricing = self.PRICING.get(
            self.config.model, {"input": 3.00, "output": 15.00}
        )

        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]

        return LLMCost(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_usd=input_cost + output_cost,
            model=self.config.model,
        )


class OllamaProvider(BaseLLMProvider):
    """Ollama local model provider."""

    async def generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> str:
        """Generate using Ollama."""
        import httpx

        base_url = self.config.base_url or "http://localhost:11434"

        async with httpx.AsyncClient(timeout=self.config.timeout) as client:
            response = await client.post(
                f"{base_url}/api/generate",
                json={
                    "model": self.config.model,
                    "prompt": prompt,
                    "system": system_prompt or "",
                    "temperature": self.config.temperature,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    def calculate_cost(self, input_tokens: int, output_tokens: int) -> LLMCost:
        """Calculate Ollama cost (free for local)."""
        return LLMCost(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_usd=0.0,
            model=self.config.model,
        )


class LLMProviderManager:
    """Manages multiple LLM providers and fallback strategies."""

    def __init__(self, default_config: Optional[LLMConfig] = None):
        """Initialize provider manager.

        Args:
            default_config: Default LLM configuration
        """
        if default_config is None:
            # Default to Gemini
            default_config = LLMConfig(
                provider=LLMProvider.GEMINI,
                model="gemini-2.5-flash",
                api_key=os.getenv("GOOGLE_API_KEY"),
            )

        self.default_config = default_config
        self.providers: Dict[LLMProvider, BaseLLMProvider] = {}
        self.total_cost: float = 0.0
        self.usage_history: List[LLMCost] = []

    def get_provider(self, config: Optional[LLMConfig] = None) -> BaseLLMProvider:
        """Get or create LLM provider.

        Args:
            config: LLM configuration (uses default if not provided)

        Returns:
            LLM provider instance
        """
        if config is None:
            config = self.default_config

        # Return cached provider if exists
        if config.provider in self.providers:
            return self.providers[config.provider]

        # Create new provider
        provider_class = {
            LLMProvider.GEMINI: GeminiProvider,
            LLMProvider.OPENAI: OpenAIProvider,
            LLMProvider.ANTHROPIC: AnthropicProvider,
            LLMProvider.OLLAMA: OllamaProvider,
        }.get(config.provider)

        if provider_class is None:
            raise ValueError(f"Unsupported provider: {config.provider}")

        provider = provider_class(config)
        self.providers[config.provider] = provider
        return provider

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        config: Optional[LLMConfig] = None,
        fallback_providers: Optional[List[LLMProvider]] = None,
    ) -> str:
        """Generate text with fallback support.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            config: LLM configuration
            fallback_providers: List of fallback providers to try on failure

        Returns:
            Generated text
        """
        provider = self.get_provider(config)

        try:
            return await provider.generate(prompt, system_prompt)
        except Exception as e:
            # Try fallback providers
            if fallback_providers:
                for fallback in fallback_providers:
                    try:
                        fallback_config = LLMConfig(
                            provider=fallback,
                            model=self._get_default_model(fallback),
                        )
                        fallback_provider = self.get_provider(fallback_config)
                        return await fallback_provider.generate(prompt, system_prompt)
                    except Exception:
                        continue

            # No fallback succeeded, raise original error
            raise e

    def _get_default_model(self, provider: LLMProvider) -> str:
        """Get default model for a provider."""
        defaults = {
            LLMProvider.GEMINI: "gemini-2.5-flash",
            LLMProvider.OPENAI: "gpt-4o-mini",
            LLMProvider.ANTHROPIC: "claude-3-5-sonnet-20241022",
            LLMProvider.OLLAMA: "llama3",
        }
        return defaults.get(provider, "unknown")

    def track_usage(self, cost: LLMCost):
        """Track LLM usage and cost.

        Args:
            cost: Cost information
        """
        self.usage_history.append(cost)
        self.total_cost += cost.cost_usd

    def get_total_cost(self) -> float:
        """Get total accumulated cost."""
        return self.total_cost

    def get_usage_summary(self) -> Dict[str, Any]:
        """Get usage summary statistics."""
        total_tokens = sum(c.total_tokens for c in self.usage_history)
        by_model: Dict[str, Dict[str, Any]] = {}

        for cost in self.usage_history:
            if cost.model not in by_model:
                by_model[cost.model] = {
                    "tokens": 0,
                    "cost": 0.0,
                    "calls": 0,
                }
            by_model[cost.model]["tokens"] += cost.total_tokens
            by_model[cost.model]["cost"] += cost.cost_usd
            by_model[cost.model]["calls"] += 1

        return {
            "total_cost": self.total_cost,
            "total_tokens": total_tokens,
            "total_calls": len(self.usage_history),
            "by_model": by_model,
        }


# Global provider manager instance
_provider_manager: Optional[LLMProviderManager] = None


def get_provider_manager() -> LLMProviderManager:
    """Get or create the global LLM provider manager."""
    global _provider_manager
    if _provider_manager is None:
        _provider_manager = LLMProviderManager()
    return _provider_manager
