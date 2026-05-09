import networkx as nx
import math

DIST_THRESHOLD = 30

def build_graph(players):
    G = nx.Graph()

    for p in players:
        G.add_node(p["id"], pos=(p["x"], p["y"]))

    for i in players:
        for j in players:
            if i["id"] == j["id"]:
                continue

            dist = math.dist((i["x"], i["y"]), (j["x"], j["y"]))

            if dist < DIST_THRESHOLD:
                weight = 1 / (dist + 1e-5)
                G.add_edge(i["id"], j["id"], weight=weight)

    return G