export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function readCachedSnapshot(storage, key, now = Date.now()) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return { snapshot: null, expired: false };

    const snapshot = JSON.parse(raw);
    const fetchedAt = snapshot?.fetchedAt ? Date.parse(snapshot.fetchedAt) : NaN;
    if (Number.isNaN(fetchedAt) || now - fetchedAt > CACHE_TTL_MS) {
      storage.removeItem(key);
      return { snapshot: null, expired: true };
    }

    return { snapshot, expired: false };
  } catch {
    return { snapshot: null, expired: false };
  }
}

export function writeCachedSnapshot(storage, key, snapshot) {
  try {
    storage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

export function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function hasResult(match) {
  return match.home_score !== null && match.home_score !== undefined && match.away_score !== null && match.away_score !== undefined;
}

export function hasNumericValue(value) {
  return value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value));
}

export function isUpcoming(match, now = new Date()) {
  const date = parseDate(match.date || match.initial_date);
  if (!date) return true;
  return !hasResult(match) && date >= now;
}

export function sortByDateAsc(a, b) {
  return (parseDate(a.date || a.initial_date)?.getTime() || 0) - (parseDate(b.date || b.initial_date)?.getTime() || 0);
}

export function sortByDateDesc(a, b) {
  return sortByDateAsc(b, a);
}

export function groupByDate(matches) {
  return matches.reduce((acc, match) => {
    const raw = match.date || match.initial_date || 'inconnu';
    const key = raw === 'inconnu' ? raw : raw.slice(0, 10);
    acc[key] ||= [];
    acc[key].push(match);
    return acc;
  }, {});
}

export function formatGroupLabel(key) {
  if (key === 'inconnu') return 'Date inconnue';
  const date = new Date(`${key}T00:00:00`);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(date);
}

export function isOnOrBeforeAsOf(match, asOf) {
  const raw = match.date || match.initial_date;
  const matchDate = raw ? raw.slice(0, 10) : null;
  return !matchDate || matchDate <= asOf;
}

export function teamNameFromMatch(match) {
  return match?.short_name || match?.club?.short_name || match?.club?.name || 'Équipe';
}

export function teamKeyFromMatch(match) {
  return String(match?.club?.cl_no || teamNameFromMatch(match));
}

export function matchIsClubTeam(clubId, match, teamNumber) {
  return (
    (match.home?.club?.cl_no === clubId && Number(match.home?.number) === teamNumber) ||
    (match.away?.club?.cl_no === clubId && Number(match.away?.number) === teamNumber)
  );
}

export function matchMatchesResultsFilter(clubId, match, filter) {
  if (filter === 'team-1') return matchIsClubTeam(clubId, match, 1);
  if (filter === 'team-2') return matchIsClubTeam(clubId, match, 2);
  return matchIsClubTeam(clubId, match, 1) || matchIsClubTeam(clubId, match, 2);
}

export function matchMatchesCalendarFilter(clubId, match, filter) {
  if (filter === 'team-1') return matchIsClubTeam(clubId, match, 1);
  if (filter === 'team-2') return matchIsClubTeam(clubId, match, 2);
  return matchIsClubTeam(clubId, match, 1) || matchIsClubTeam(clubId, match, 2);
}

export function buildStandings(matches) {
  const rows = new Map();

  function ensureRow(matchSide) {
    const key = teamKeyFromMatch(matchSide);
    if (!rows.has(key)) {
      rows.set(key, {
        key,
        clubNo: matchSide?.club?.cl_no || null,
        name: teamNameFromMatch(matchSide),
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        forfeits: 0,
        penalties: 0,
        points: 0,
      });
    }
    return rows.get(key);
  }

  matches.forEach((match) => {
    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) return;

    const home = ensureRow(match.home);
    const away = ensureRow(match.away);

    home.played += 1;
    away.played += 1;
    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;
    home.penalties += Number(match.home_nb_point_pena || 0);
    away.penalties += Number(match.away_nb_point_pena || 0);
    if (String(match.home_is_forfeit || '').toUpperCase() === 'O') home.forfeits += 1;
    if (String(match.away_is_forfeit || '').toUpperCase() === 'O') away.forfeits += 1;

    const homePoints = hasNumericValue(match.home_nb_point) ? Number(match.home_nb_point) : null;
    const awayPoints = hasNumericValue(match.away_nb_point) ? Number(match.away_nb_point) : null;

    if (homePoints !== null && awayPoints !== null) {
      home.points += homePoints;
      away.points += awayPoints;
    } else if (homeScore > awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (homeScore < awayScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  return [...rows.values()].sort((a, b) => {
    const diffA = a.gf - a.ga;
    const diffB = b.gf - b.ga;
    return (
      (b.points - a.points) ||
      (diffB - diffA) ||
      (b.gf - a.gf) ||
      (b.wins - a.wins) ||
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    );
  }).map((row, index) => ({ ...row, rank: index + 1, diff: row.gf - row.ga }));
}
