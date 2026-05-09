def get_recommendations(entropy, diameter):
    recs = []

    if entropy > 0.7:
        recs.append("High instability — compress formation")

    if diameter > 100:
        recs.append("Team too spread — reduce gaps")

    if not recs:
        recs.append("Structure stable")

    return recs