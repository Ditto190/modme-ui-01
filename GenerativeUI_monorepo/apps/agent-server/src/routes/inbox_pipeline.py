"""FastAPI routes for the MDA inbox pipeline"""

from __future__ import annotations

from time import perf_counter

from fastapi import APIRouter

from ..agents.ingestion_specialist import AG2_AVAILABLE as INGESTION_AG2_AVAILABLE
from ..agents.ingestion_specialist import IngestionSpecialist
from ..agents.relations_finder import RelationsFinder
from ..agents.taxonomy_specialist import TaxonomySpecialist
from ..models.schemas import (
    CategorizeResult,
    InboxEntryInput,
    PipelineRequest,
    PipelineResponse,
)

inbox_pipeline_router = APIRouter(prefix="/api/inbox", tags=["inbox-pipeline"])

_ingestion_specialist = IngestionSpecialist()
_taxonomy_specialist = TaxonomySpecialist()
_relations_finder = RelationsFinder()
_ENTRY_STORE: dict[str, InboxEntryInput] = {}


def _resolve_entries(entry_ids: list[str]) -> tuple[list[InboxEntryInput], list[str]]:
    entries: list[InboxEntryInput] = []
    errors: list[str] = []

    for entry_id in entry_ids:
        entry = _ENTRY_STORE.get(entry_id)
        if entry is None:
            errors.append(f"Entry not found: {entry_id}")
            continue
        entries.append(entry)

    return entries, errors


@inbox_pipeline_router.post("/ingest")
async def ingest_entry(entry: InboxEntryInput) -> dict:
    """Ingest a single inbox entry and cache it for later pipeline stages."""
    processed = _ingestion_specialist.ingest_entry(entry)
    _ENTRY_STORE[processed.content_hash] = processed
    return {
        "entry_id": processed.content_hash,
        "entry": processed.model_dump(),
        "stored": True,
    }


@inbox_pipeline_router.post("/categorize", response_model=PipelineResponse)
async def categorize_entries(request: PipelineRequest) -> PipelineResponse:
    """Assign tags, severity, and category metadata to cached inbox entries."""
    started = perf_counter()
    entries, errors = _resolve_entries(request.entry_ids)
    results: list[CategorizeResult] = []

    for entry in entries:
        text = " ".join(
            filter(None, [entry.title, entry.summary, entry.raw_content, entry.extracted_text])
        )
        tags = sorted(
            dict.fromkeys([*entry.tags, *_taxonomy_specialist.assign_tags(text)])
        )
        severity = _taxonomy_specialist.classify_severity(tags, text)
        category_id = _taxonomy_specialist.find_category(tags)
        processed = entry.model_copy(
            update={"tags": tags, "severity": severity, "category_id": category_id}
        )

        if not request.dry_run:
            _ENTRY_STORE[processed.content_hash] = processed

        results.append(
            CategorizeResult(
                entry_id=processed.content_hash,
                tags=tags,
                category_id=category_id,
                severity=severity,
            )
        )

    return PipelineResponse(
        processed=len(results),
        results=results,
        errors=errors,
        duration_ms=round((perf_counter() - started) * 1000, 2),
    )


@inbox_pipeline_router.post("/relate", response_model=PipelineResponse)
async def relate_entries(request: PipelineRequest) -> PipelineResponse:
    """Discover relations between previously ingested inbox entries."""
    started = perf_counter()
    entries, errors = _resolve_entries(request.entry_ids)
    results: list[CategorizeResult] = []

    for entry in entries:
        candidates = [candidate for candidate in entries if candidate.content_hash != entry.content_hash]
        relations = _relations_finder.find_keyword_relations(entry, candidates)
        results.append(
            CategorizeResult(
                entry_id=entry.content_hash,
                tags=entry.tags,
                category_id=entry.category_id,
                severity=entry.severity,
                relations=relations,
                confidence=0.9 if relations else 0.75,
            )
        )

    return PipelineResponse(
        processed=len(results),
        results=results,
        errors=errors,
        duration_ms=round((perf_counter() - started) * 1000, 2),
    )


@inbox_pipeline_router.get("/health")
async def inbox_pipeline_health() -> dict:
    """Return inbox pipeline health and cache metrics."""
    return {
        "status": "healthy",
        "pipeline": "mda-inbox",
        "ag2_available": INGESTION_AG2_AVAILABLE,
        "stored_entries": len(_ENTRY_STORE),
    }
