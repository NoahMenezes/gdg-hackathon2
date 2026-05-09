import networkx as nx

def compute_diameter(G):
    if nx.is_connected(G):
        return nx.diameter(G)
    return 0

def compute_avg_shortest_path(G):
    if nx.is_connected(G):
        return nx.average_shortest_path_length(G)
    return 0

def compute_centrality(G):
    centrality = nx.degree_centrality(G)
    return [
        {"id": k, "score": v}
        for k, v in sorted(centrality.items(), key=lambda x: -x[1])[:3]
    ]