from fastapi import APIRouter
from algorithms.graph_builder import build_graph
from algorithms.articulation import get_articulation_points
from algorithms.metrics import compute_diameter, compute_avg_shortest_path, compute_centrality
from algorithms.entropy import compute_entropy
from algorithms.recommendations import get_recommendations

router = APIRouter()

@router.post("/analyze")
def analyze(data: dict):
    players = data["players"]

    G = build_graph(players)

    entropy = compute_entropy(players)
    diameter = compute_diameter(G)
    avg_path = compute_avg_shortest_path(G)
    articulation = get_articulation_points(G)
    central = compute_centrality(G)

    recs = get_recommendations(entropy, diameter)

    edges = [
        {
            "source": u,
            "target": v,
            "weight": d["weight"]
        }
        for u, v, d in G.edges(data=True)
    ]

    return {
        "entropy": entropy,
        "stability": "critical" if entropy > 0.7 else "stable",
        "diameter": diameter,
        "avg_shortest_path": avg_path,
        "articulation_points": articulation,
        "central_players": central,
        "edges": edges,
        "recommendations": recs
    }