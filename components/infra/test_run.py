from algorithms.graph_builder import build_graph
from algorithms.articulation import get_articulation_points
from algorithms.metrics import compute_diameter

from test_data import players

G = build_graph(players)

print("Nodes:", G.nodes())
print("Edges:", G.edges(data=True))

print("Articulation Points:", get_articulation_points(G))
print("Diameter:", compute_diameter(G))