"""
MDA (Master Data Architect) Lead Agent
Orchestrates 5 specialist subagents: IngestionSpecialist, TaxonomySpecialist,
RelationsFinder, OutputGenerator, SyntacticMapper

@feature AGENT.MDA.ORCHESTRATE
@domain INBOX
@layer AGENT
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from time import perf_counter
from typing import Any, Optional

try:
    from autogen import AssistantAgent

    AG2_AVAILABLE = True
except ImportError:
    AssistantAgent = Any
    AG2_AVAILABLE = False

from .groupchat import AgentGroupChat
from .ingestion_specialist import IngestionSpecialist
from .output_generator import OutputGenerator
from .relations_finder import RelationsFinder
from .syntactic_mapper import SyntacticMapper
from .taxonomy_specialist import TaxonomySpecialist
from ..models.schemas import CategorizeResult, InboxEntryInput, PipelineResponse


class MDALead(AgentGroupChat):
    """Coordinates deterministic inbox processing with AG2-aware specialists."""

    def __init__(self, config: Optional[dict[str, Any]] = None):
        super().__init__(config=config)
        self.config = config or {}
        self.ingestion_specialist = IngestionSpecialist(self.config)
        self.taxonomy_specialist = TaxonomySpecialist(self.config)
        self.relations_finder = RelationsFinder(self.config)
        self.output_generator = OutputGenerator(self.config)
        self.syntactic_mapper = SyntacticMapper(self.config)
        self._entry_index: dict[str, InboxEntryInput] = {}
        self.specialist_agents: dict[str, AssistantAgent] = {}

        if AG2_AVAILABLE:
            self._setup_specialist_agents()

    def _setup_specialist_agents(self) -> None:
        """Set up named AG2 specialist agents for orchestration visibility."""
        llm_config = {
            "model": self.config.get("model", "gpt-4"),
            "api_key": self.config.get("api_key", ""),
            "temperature": 0,
        }
        specialist_messages = {
            "IngestionSpecialist": "Normalize inbox entries and extract structured fields.",
            "TaxonomySpecialist": "Assign stable tags, severity, and category slugs.",
            "RelationsFinder": "Identify bidirectional relations and ADR candidates.",
            "OutputGenerator": "Produce reusable artefact payloads from processed entries.",
            "SyntacticMapper": "Map entries into downstream schemas and metadata.",
        }
        self.specialist_agents = {
            name: AssistantAgent(
                name=name,
                system_message=message,
                llm_config=llm_config,
            )
            for name, message in specialist_messages.items()
        }

    async def process_entries(self, entries: list[InboxEntryInput]) -> PipelineResponse:
        """Run ingestion, taxonomy, mapping, and relation discovery for inbox entries."""
        started = perf_counter()

        try:
            if not AG2_AVAILABLE:
                return await self._mock_process_entries(entries, started)

            ingested_entries = await self._run_ingestion_team(entries)
            taxonomy_results = await self._run_taxonomy_team(ingested_entries)
            self._entry_index = {
                entry.content_hash: entry for entry in taxonomy_results["entries"]
            }
            relations_by_entry = await self._run_relations_team(
                list(self._entry_index.keys())
            )

            results = [
                CategorizeResult(
                    entry_id=entry.content_hash,
                    tags=entry.tags,
                    category_id=entry.category_id,
                    severity=entry.severity,
                    relations=relations_by_entry.get(entry.content_hash, []),
                    confidence=taxonomy_results["confidence"].get(entry.content_hash, 1.0),
                    processed_at=datetime.now().timestamp(),
                )
                for entry in taxonomy_results["entries"]
            ]
            duration_ms = round((perf_counter() - started) * 1000, 2)
            return PipelineResponse(
                processed=len(results),
                results=results,
                duration_ms=duration_ms,
            )
        except Exception as exc:
            duration_ms = round((perf_counter() - started) * 1000, 2)
            return PipelineResponse(
                processed=0,
                results=[],
                errors=[str(exc)],
                duration_ms=duration_ms,
            )

    async def _run_ingestion_team(
        self, entries: list[InboxEntryInput]
    ) -> list[InboxEntryInput]:
        """Process entries through the ingestion specialist."""
        tasks = [
            asyncio.to_thread(self.ingestion_specialist.ingest_entry, entry)
            for entry in entries
        ]
        return await asyncio.gather(*tasks)

    async def _run_taxonomy_team(
        self, entries: list[InboxEntryInput]
    ) -> dict[str, Any]:
        """Run taxonomy and syntactic mapping in parallel and merge results."""

        async def assign_taxonomy() -> dict[str, dict[str, Any]]:
            result: dict[str, dict[str, Any]] = {}
            for entry in entries:
                text = " ".join(
                    filter(
                        None,
                        [
                            entry.title,
                            entry.summary,
                            entry.raw_content,
                            entry.extracted_text,
                        ],
                    )
                )
                tags = sorted(
                    dict.fromkeys([*entry.tags, *self.taxonomy_specialist.assign_tags(text)])
                )
                result[entry.content_hash] = {
                    "tags": tags,
                    "severity": self.taxonomy_specialist.classify_severity(tags, text),
                    "category_id": self.taxonomy_specialist.find_category(tags),
                }
            return result

        async def map_syntax() -> dict[str, dict[str, Any]]:
            return {
                entry.content_hash: self.syntactic_mapper.build_output_metadata(entry)
                for entry in entries
            }

        taxonomy_map, syntax_map = await asyncio.gather(assign_taxonomy(), map_syntax())
        updated_entries: list[InboxEntryInput] = []
        confidence: dict[str, float] = {}

        for entry in entries:
            taxonomy = taxonomy_map.get(entry.content_hash, {})
            syntax = syntax_map.get(entry.content_hash, {})
            schema_type = syntax.get("schema_type")
            updated_entry = entry.model_copy(
                update={
                    "tags": taxonomy.get("tags", entry.tags),
                    "severity": taxonomy.get("severity", entry.severity),
                    "category_id": taxonomy.get("category_id", entry.category_id),
                    "entry_type": entry.entry_type or schema_type,
                }
            )
            updated_entries.append(updated_entry)
            confidence[entry.content_hash] = 0.95 if schema_type else 0.85

        return {"entries": updated_entries, "confidence": confidence}

    async def _run_relations_team(
        self, entry_ids: list[str]
    ) -> dict[str, list[dict[str, Any]]]:
        """Run relation discovery across the processed entry set."""
        selected_entries = [
            self._entry_index[entry_id]
            for entry_id in entry_ids
            if entry_id in self._entry_index
        ]
        relations: dict[str, list[dict[str, Any]]] = {}

        for entry in selected_entries:
            relations[entry.content_hash] = self.relations_finder.find_keyword_relations(
                entry, selected_entries
            )

        return relations

    async def _mock_process_entries(
        self, entries: list[InboxEntryInput], started: float
    ) -> PipelineResponse:
        """Deterministic fallback when AG2 is unavailable."""
        ingested_entries = await self._run_ingestion_team(entries)
        taxonomy_results = await self._run_taxonomy_team(ingested_entries)
        self._entry_index = {
            entry.content_hash: entry for entry in taxonomy_results["entries"]
        }
        relations_by_entry = await self._run_relations_team(list(self._entry_index.keys()))

        results = [
            CategorizeResult(
                entry_id=entry.content_hash,
                tags=entry.tags,
                category_id=entry.category_id,
                severity=entry.severity,
                relations=relations_by_entry.get(entry.content_hash, []),
                confidence=taxonomy_results["confidence"].get(entry.content_hash, 1.0),
                processed_at=datetime.now().timestamp(),
            )
            for entry in taxonomy_results["entries"]
        ]
        duration_ms = round((perf_counter() - started) * 1000, 2)
        return PipelineResponse(
            processed=len(results),
            results=results,
            duration_ms=duration_ms,
        )
