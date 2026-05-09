import networkx as nx

def get_articulation_points(G):
    return list(nx.articulation_points(G))