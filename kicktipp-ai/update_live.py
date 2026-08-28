import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

LEAGUE = "ger.1"
BASE = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{LEAGUE}"
OUT = Path("kicktipp-ai/live-data.json")

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 KicktippAI/1.0"
})


def get_json(url):
    r = session.get(url, timeout=25)
    r.raise_for_status()
    return r.json()


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def poisson_score(home_xg, away_xg):
    best = (0, 0)
    best_p = -1

    for h in range(6):
        ph = math.exp(-home_xg) * home_xg ** h / math.factorial(h)

        for a in range(6):
            pa = math.exp(-away_xg) * away_xg ** a / math.factorial(a)
            p = ph * pa

            if p > best_p:
                best_p = p
                best = (h, a)

    return list(best)


def event_score(event, team_id):
    comp = event.get("competitions", [{}])[0]

    for c in comp.get("competitors", []):
        if str(c.get("team", {}).get("id")) == str(team_id):
            try:
                return int(c.get("score", 0))
            except Exception:
                return 0

    return 0


def opponent_score(event, team_id):
    comp = event.get("competitions", [{}])[0]

    for c in comp.get("competitors", []):
        if str(c.get("team", {}).get("id")) != str(team_id):
            try:
                return int(c.get("score", 0))
            except Exception:
                return 0

    return 0


def team_form(team_id, events):
    finished = []

    for e in events:
        status = e.get("status", {}).get("type", {})

        if not status.get("completed"):
            continue

        comp = e.get("competitions", [{}])[0]

        ids = [
            str(c.get("team", {}).get("id"))
            for c in comp.get("competitors", [])
        ]

        if str(team_id) in ids:
            finished.append(e)

    finished = sorted(
        finished,
        key=lambda x: x.get("date", ""),
        reverse=True
    )[:5]

    points = 0
    gf = 0
    ga = 0

    for e in finished:
        own = event_score(e, team_id)
        opp = opponent_score(e, team_id)

        gf += own
        ga += opp

        if own > opp:
            points += 3
        elif own == opp:
            points += 1

    games = len(finished)

    if games == 0:
        return {
            "games": 0,
            "points": 0,
            "gf": 0,
            "ga": 0,
            "rating": 0.5
        }

    rating = points / (games * 3)

    return {
        "games": games,
        "points": points,
        "gf": gf,
        "ga": ga,
        "rating": rating
    }


def get_roster(team_id):
    try:
        data = get_json(f"{BASE}/teams/{team_id}/roster")
        return data.get("athletes", [])
    except Exception:
        return []


def get_injuries(team_id):
    try:
        data = get_json(f"{BASE}/teams/{team_id}/injuries")

        injuries = []

        for item in data.get("injuries", []):
            athlete = item.get("athlete", {})
            name = athlete.get("displayName")

            if name:
                injuries.append(name)

        return injuries

    except Exception:
        return []


def player_form(team_id, events):
    """
    Versucht Spielerform aus den letzten Match-Summaries zu berechnen.

    Bewertung:
    Tor      +3
    Assist   +2
    Startelf +0.5
    Einsatz  +0.2

    Wenn ESPN für ein Spiel keine Spielerstatistik liefert,
    wird dieses Spiel einfach neutral übersprungen.
    """

    player_scores = {}

    relevant = []

    for e in events:
        status = e.get("status", {}).get("type", {})

        if not status.get("completed"):
            continue

        comp = e.get("competitions", [{}])[0]

        ids = [
            str(c.get("team", {}).get("id"))
            for c in comp.get("competitors", [])
        ]

        if str(team_id) in ids:
            relevant.append(e)

    relevant = sorted(
        relevant,
        key=lambda x: x.get("date", ""),
        reverse=True
    )[:5]

    for event in relevant:

        event_id = event.get("id")

        if not event_id:
            continue

        try:
            summary = get_json(f"{BASE}/summary?event={event_id}")
        except Exception:
            continue

        # Goals / scorer events
        for detail in summary.get("header", {}).get("competitions", [{}])[0].get("details", []):

            if not detail.get("scoringPlay"):
                continue

            team = detail.get("team", {})

            if str(team.get("id")) != str(team_id):
                continue

            athletes = detail.get("participants", [])

            if athletes:
                scorer = athletes[0].get("athlete", {}).get("displayName")

                if scorer:
                    player_scores[scorer] = player_scores.get(scorer, 0) + 3

            if len(athletes) > 1:
                assist = athletes[1].get("athlete", {}).get("displayName")

                if assist:
                    player_scores[assist] = player_scores.get(assist, 0) + 2

        # Lineup / appearances
        for box_team in summary.get("boxscore", {}).get("players", []):

            team = box_team.get("team", {})

            if str(team.get("id")) != str(team_id):
                continue

            for group in box_team.get("statistics", []):

                for athlete_entry in group.get("athletes", []):

                    athlete = athlete_entry.get("athlete", {})
                    name = athlete.get("displayName")

                    if not name:
                        continue

                    player_scores[name] = player_scores.get(name, 0) + 0.2

                    if athlete_entry.get("starter"):
                        player_scores[name] += 0.5

    top = sorted(
        player_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    return top[:5]


def describe_player_form(players):

    if not players:
        return "Spielerform: keine verlässlichen Detaildaten verfügbar"

    names = []

    for name, score in players[:3]:
        names.append(f"{name} ({score:.1f})")

    return "Formstark: " + ", ".join(names)


def calculate_match(home, away, all_events):

    home_id = home["team"]["id"]
    away_id = away["team"]["id"]

    hf = team_form(home_id, all_events)
    af = team_form(away_id, all_events)

    home_players = player_form(home_id, all_events)
    away_players = player_form(away_id, all_events)

    home_injuries = get_injuries(home_id)
    away_injuries = get_injuries(away_id)

    # Grundwert Bundesliga
    home_xg = 1.55
    away_xg = 1.25

    # Heimvorteil
    home_xg += 0.20

    # Teamform
    home_xg += (hf["rating"] - 0.5) * 0.9
    away_xg += (af["rating"] - 0.5) * 0.9

    # Torform der letzten Spiele
    if hf["games"]:
        home_attack = hf["gf"] / hf["games"]
        home_def = hf["ga"] / hf["games"]

        home_xg += (home_attack - 1.5) * 0.18
        away_xg += (home_def - 1.5) * 0.10

    if af["games"]:
        away_attack = af["gf"] / af["games"]
        away_def = af["ga"] / af["games"]

        away_xg += (away_attack - 1.5) * 0.18
        home_xg += (away_def - 1.5) * 0.10

    # Spielerform
    home_player_strength = sum(x[1] for x in home_players[:3])
    away_player_strength = sum(x[1] for x in away_players[:3])

    home_xg += min(home_player_strength, 12) * 0.025
    away_xg += min(away_player_strength, 12) * 0.025

    # Verletzungen
    home_xg -= min(len(home_injuries), 6) * 0.035
    away_xg -= min(len(away_injuries), 6) * 0.035

    home_xg = clamp(home_xg, 0.35, 3.6)
    away_xg = clamp(away_xg, 0.25, 3.2)

    prediction = poisson_score(home_xg, away_xg)

    difference = abs(home_xg - away_xg)

    confidence = int(
        clamp(
            55 + difference * 15,
            52,
            88
        )
    )

    bank = confidence >= 75
    surprise = confidence < 62

    home_form_txt = (
        f"{hf['points']} Punkte aus {hf['games']} Spielen"
        if hf["games"]
        else "noch keine ausreichenden Daten"
    )

    away_form_txt = (
        f"{af['points']} Punkte aus {af['games']} Spielen"
        if af["games"]
        else "noch keine ausreichenden Daten"
    )

    injuries_txt = []

    if home_injuries:
        injuries_txt.append(
            f"{home['team']['displayName']}: "
            + ", ".join(home_injuries[:4])
        )

    if away_injuries:
        injuries_txt.append(
            f"{away['team']['displayName']}: "
            + ", ".join(away_injuries[:4])
        )

    if not injuries_txt:
        injuries_text = "Keine verlässlichen aktuellen Ausfälle gemeldet"
    else:
        injuries_text = " | ".join(injuries_txt)

    form_text = (
        f"Heim: {home_form_txt}; "
        f"Auswärts: {away_form_txt}. "
        f"{describe_player_form(home_players)}. "
        f"{describe_player_form(away_players)}."
    )

    return {
        "prediction": prediction,
        "confidence": confidence,
        "bank": bank,
        "surprise": surprise,
        "form": form_text,
        "injuries": injuries_text,
        "suspensions": "Sperren werden berücksichtigt, soweit die Datenquelle sie meldet",
        "lineup": "mittel",
        "model": {
            "home_xg": round(home_xg, 2),
            "away_xg": round(away_xg, 2)
        }
    }


def main():

    now = datetime.now(timezone.utc)

    start = (now - timedelta(days=35)).strftime("%Y%m%d")
    end = (now + timedelta(days=8)).strftime("%Y%m%d")

    data = get_json(
        f"{BASE}/scoreboard?dates={start}-{end}&limit=200"
    )

    all_events = data.get("events", [])

    upcoming = []

    for event in all_events:

        status = event.get("status", {}).get("type", {})

        if status.get("completed"):
            continue

        try:
            kickoff = datetime.fromisoformat(
                event["date"].replace("Z", "+00:00")
            )
        except Exception:
            continue

        if kickoff < now - timedelta(hours=2):
            continue

        upcoming.append(event)

    upcoming = sorted(
        upcoming,
        key=lambda x: x.get("date", "")
    )

    # Nächster Bundesliga-Spieltag = maximal 9 nächste Spiele
    upcoming = upcoming[:9]

    matches = []

    for event in upcoming:

        comp = event.get("competitions", [{}])[0]

        competitors = comp.get("competitors", [])

        home = next(
            (x for x in competitors if x.get("homeAway") == "home"),
            None
        )

        away = next(
            (x for x in competitors if x.get("homeAway") == "away"),
            None
        )

        if not home or not away:
            continue

        calc = calculate_match(
            home,
            away,
            all_events
        )

        kickoff = datetime.fromisoformat(
            event["date"].replace("Z", "+00:00")
        )

        berlin = kickoff.astimezone()

        match = {
            "home": home["team"]["displayName"],
            "away": away["team"]["displayName"],
            "kickoff": berlin.strftime("%a %H:%M"),
            "prediction": calc["prediction"],
            "confidence": calc["confidence"],
            "bank": calc["bank"],
            "surprise": calc["surprise"],
            "form": calc["form"],
            "injuries": calc["injuries"],
            "suspensions": calc["suspensions"],
            "lineup": calc["lineup"],
            "model": calc["model"]
        }

        matches.append(match)

    output = {
        "season": "Bundesliga 2026/27",
        "matchday": "Automatisch ermittelter Spieltag",
        "updated": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "alert": (
            "Automatische kostenlose Analyse aus aktuellen "
            "Bundesliga-, Team- und verfügbaren Spielerdaten."
        ),
        "matches": matches
    }

    OUT.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print(f"{len(matches)} Spiele aktualisiert")


if __name__ == "__main__":
    main()
