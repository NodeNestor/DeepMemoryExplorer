"""Graph exploration endpoints -- transforms HiveMindDB graph data for react-force-graph."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from ..dependencies import get_hivemind_client
from ..hivemind import HiveMindClient
from ..models import EntitySearchRequest, GraphLink, GraphNode, GraphResponse, GraphTraverseRequest

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.post("/traverse", response_model=GraphResponse)
async def traverse_graph(
    req: GraphTraverseRequest,
    hm: HiveMindClient = Depends(get_hivemind_client),
):
    entity_id = req.entity_id

    # Resolve entity_name to entity_id if needed
    if entity_id is None:
        if not req.entity_name:
            raise HTTPException(
                status_code=400,
                detail="Either entity_id or entity_name must be provided",
            )
        entity = await hm.find_entity(req.entity_name)
        if not entity:
            raise HTTPException(
                status_code=404,
                detail=f"Entity '{req.entity_name}' not found",
            )
        entity_id = entity.id

    raw = await hm.graph_traverse(entity_id, depth=req.depth)

    # Transform to react-force-graph format
    nodes_map: dict[int, GraphNode] = {}
    links_set: set[tuple[int, int, str]] = set()
    links: list[GraphLink] = []

    for tnode in raw.nodes:
        ent = tnode.entity
        rel_count = len(tnode.relationships)
        if ent.id not in nodes_map:
            nodes_map[ent.id] = GraphNode(
                id=ent.id,
                name=ent.name,
                entity_type=ent.entity_type,
                description=ent.description,
                val=max(rel_count, 1),
            )
        else:
            # Update val with max relationship count seen
            existing = nodes_map[ent.id]
            if rel_count > existing.val:
                existing.val = rel_count

        for rel in tnode.relationships:
            src = rel.get("source_entity_id", rel.get("source", 0))
            tgt = rel.get("target_entity_id", rel.get("target", 0))
            rtype = rel.get("relation_type", "related")
            key = (src, tgt, rtype)
            if key not in links_set:
                links_set.add(key)
                links.append(
                    GraphLink(
                        source=src,
                        target=tgt,
                        relation_type=rtype,
                        description=rel.get("description"),
                        weight=rel.get("weight", 1.0),
                    )
                )

    return GraphResponse(nodes=list(nodes_map.values()), links=links)


@router.get("/full", response_model=GraphResponse)
async def full_graph(
    depth: int = Query(default=2, ge=1, le=10, description="Traversal depth per entity"),
    max_nodes: int = Query(default=2000, ge=100, le=10000, description="Max nodes to return"),
    hm: HiveMindClient = Depends(get_hivemind_client),
):
    """Build the complete entity graph by traversing from all entities.

    Returns all entities as nodes and all relationships as links.
    Use depth and max_nodes query params to control scope.
    """
    import asyncio

    # Get total entity count from health
    health = await hm.get_system_health()
    total_entities = health.get("knowledge_graph", {}).get("entities", 0) if health else 0

    # Determine entity ID range to scan
    max_id = max(total_entities + 100, 500)

    nodes_map: dict[int, GraphNode] = {}
    links_set: set[tuple[int, int, str]] = set()
    links: list[GraphLink] = []

    # Traverse from every entity ID in batches
    batch_size = 20
    for batch_start in range(1, max_id + 1, batch_size):
        if len(nodes_map) >= max_nodes:
            break
        batch_ids = range(batch_start, min(batch_start + batch_size, max_id + 1))
        tasks = [hm.graph_traverse(eid, depth=depth) for eid in batch_ids]
        results = await asyncio.gather(*tasks)

        for raw in results:
            for tnode in raw.nodes:
                ent = tnode.entity
                rel_count = len(tnode.relationships)
                if ent.id not in nodes_map:
                    nodes_map[ent.id] = GraphNode(
                        id=ent.id,
                        name=ent.name,
                        entity_type=ent.entity_type,
                        description=ent.description,
                        val=max(rel_count, 1),
                    )
                elif rel_count > nodes_map[ent.id].val:
                    nodes_map[ent.id].val = rel_count

                for rel in tnode.relationships:
                    src = rel.get("source_entity_id", rel.get("source", 0))
                    tgt = rel.get("target_entity_id", rel.get("target", 0))
                    rtype = rel.get("relation_type", "related")
                    key = (src, tgt, rtype)
                    if key not in links_set:
                        links_set.add(key)
                        links.append(
                            GraphLink(
                                source=src,
                                target=tgt,
                                relation_type=rtype,
                                description=rel.get("description"),
                                weight=rel.get("weight", 1.0),
                            )
                        )

    # Only keep links where both endpoints exist in nodes_map
    valid_links = [l for l in links if l.source in nodes_map and l.target in nodes_map]

    return GraphResponse(nodes=list(nodes_map.values()), links=valid_links)


@router.get("/entity/{entity_id}")
async def get_entity(
    entity_id: int,
    hm: HiveMindClient = Depends(get_hivemind_client),
):
    entity = await hm.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity.model_dump(mode="json")


@router.get("/entity/{entity_id}/relationships")
async def get_entity_relationships(
    entity_id: int,
    hm: HiveMindClient = Depends(get_hivemind_client),
):
    rels = await hm.get_entity_relationships(entity_id)
    return [
        {"relationship": rel, "entity": ent.model_dump(mode="json") if ent else None}
        for rel, ent in rels
    ]


@router.post("/entities")
async def list_entities(
    req: EntitySearchRequest,
    hm: HiveMindClient = Depends(get_hivemind_client),
):
    if req.query:
        # Use search with include_graph to find entities via their associated memories
        results = await hm.search(
            query=req.query, limit=req.limit, include_graph=True
        )
        entities_map: dict[int, dict] = {}
        for r in results:
            for ent in r.related_entities:
                if ent.id not in entities_map:
                    entities_map[ent.id] = ent.model_dump(mode="json")
        return list(entities_map.values())
    else:
        # Return aggregate stats when no query
        status = await hm.get_status()
        return {"status": status}
