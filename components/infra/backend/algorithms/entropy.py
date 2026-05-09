import numpy as np

def compute_entropy(players):
    positions = np.array([[p["x"], p["y"]] for p in players])
    center = np.mean(positions, axis=0)

    spread = np.mean(np.linalg.norm(positions - center, axis=1))

    entropy = min(spread / 50, 1)  # normalize 0–1
    return entropy