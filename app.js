const CLUB_ID = 5844;
const TEAM_FALLBACK_NAME = 'Équipe 1';

const NAV_ITEMS = [
  { label: 'Accueil', page: 'home' },
  { label: 'Calendrier', page: 'calendar' },
  { label: 'Résultats', page: 'results' },
  { label: 'Classement', page: 'standings' },
  { label: 'Équipes', page: 'teams' },
  { label: 'Actualités', page: 'news' },
];

const SUBNAV = {
  home: [
    { label: 'À la une', target: 'page-home' },
    { label: 'Calendrier', page: 'calendar' },
    { label: 'Équipes', page: 'teams' },
  ],
  calendar: [
    { label: 'Tous', filter: 'all' },
    { label: 'Équipe 1', filter: 'team-1' },
    { label: 'Équipe 2', filter: 'team-2' },
  ],
  results: [
    { label: 'Tous', filter: 'all' },
    { label: 'Équipe 1', filter: 'team-1' },
    { label: 'Équipe 2', filter: 'team-2' },
  ],
  standings: [
    { label: 'Tous', filter: 'all' },
    { label: 'Équipe 1', filter: 'team-1' },
    { label: 'Équipe 2', filter: 'team-2' },
  ],
  teams: [
    { label: 'Équipe 1', target: 'teams-list' },
    { label: 'Équipe 2', target: 'teams-list' },
  ],
  news: [
    { label: 'Actualités', text: 'Aucune publication' },
  ],
};

const state = {
  club: null,
  calendar: [],
  matches: [],
  teams: [],
  standings: {
    team1: [],
    team2: {
      1: [],
      2: [],
    },
  },
  standingsTeam2Level: '1',
  standingsFilter: 'all',
  calendarFilter: 'all',
  resultsFilter: 'all',
  page: 'home',
};

const CACHE_KEY = 'essa-web-app:v1:last-known-good';
const clubLogoSrc = '/logo-essa.svg';

const primaryNav = document.querySelector('#primary-nav');
const subnav = document.querySelector('#subnav');
const homeSection = document.querySelector('#page-home');
const pageSections = [...document.querySelectorAll('.page')];
const dataStatus = document.querySelector('#data-status');
const standingsAsOf = new URL(window.location.href).searchParams.get('asOf') || new Date().toISOString().slice(0, 10);

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(snapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

function snapshotState() {
  return {
    club: state.club,
    matches: state.matches,
    teams: state.teams,
    standings: state.standings,
    fetchedAt: new Date().toISOString(),
  };
}

function applySnapshot(snapshot) {
  if (!snapshot) return false;

  state.club = snapshot.club || null;
  state.matches = Array.isArray(snapshot.matches) ? snapshot.matches : [];
  state.calendar = state.matches.filter(isUpcoming).sort(sortByDateAsc);
  state.teams = Array.isArray(snapshot.teams) ? snapshot.teams : [];
  state.standings = snapshot.standings || {
    team1: [],
    team2: { 1: [], 2: [] },
  };

  if (state.club && (state.club.short_name || state.club.district?.name || state.club.cl_no)) {
    document.querySelector('#club-meta').textContent = `${state.club.district?.name || ''} · ${state.club.short_name || ''} · club ${state.club.cl_no || CLUB_ID}`;
  }
  document.querySelector('#club-logo-top').src = clubLogoSrc;

  document.querySelector('#welcome-calendar-title').textContent = `${state.calendar.length} matchs programmés`;
  document.querySelector('#welcome-calendar-details').textContent = `Vue directe sur les prochaines rencontres du club.`;
  const essaStanding = state.standings.team1?.find?.((row) => row.clubNo === CLUB_ID);
  document.querySelector('#welcome-standing-title').textContent = essaStanding ? `Position ${essaStanding.rank}` : 'Position du club';
  document.querySelector('#welcome-standing-details').textContent = essaStanding ? `ESSA est ${essaStanding.rank}e avec ${essaStanding.points} pts.` : 'Classement calculé depuis la poule.';
  document.querySelector('#welcome-teams-title').textContent = `${state.teams.length} équipes au club`;
  document.querySelector('#welcome-teams-details').textContent = state.teams.length ? `${state.teams[0].short_name || 'Équipe 1'} en tête, puis la réserve et les futures équipes.` : 'Structure en cours de chargement.';

  renderLists();
  renderStandings();
  return true;
}

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function hasResult(match) {
  return match.home_score !== null && match.home_score !== undefined && match.away_score !== null && match.away_score !== undefined;
}

function hasNumericValue(value) {
  return value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value));
}

function isUpcoming(match) {
  const date = parseDate(match.date || match.initial_date);
  if (!date) return true;
  return !hasResult(match) && date >= new Date();
}

function sortByDateAsc(a, b) {
  return (parseDate(a.date || a.initial_date)?.getTime() || 0) - (parseDate(b.date || b.initial_date)?.getTime() || 0);
}

function sortByDateDesc(a, b) {
  return sortByDateAsc(b, a);
}

function groupByDate(matches) {
  return matches.reduce((acc, match) => {
    const raw = match.date || match.initial_date || 'inconnu';
    const key = raw === 'inconnu' ? raw : raw.slice(0, 10);
    acc[key] ||= [];
    acc[key].push(match);
    return acc;
  }, {});
}

function formatGroupLabel(key) {
  if (key === 'inconnu') return 'Date inconnue';
  const date = new Date(`${key}T00:00:00`);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(date);
}

function isOnOrBeforeAsOf(match) {
  const raw = match.date || match.initial_date;
  const matchDate = raw ? raw.slice(0, 10) : null;
  return !matchDate || matchDate <= standingsAsOf;
}

function teamNameFromMatch(match) {
  return match?.short_name || match?.club?.short_name || match?.club?.name || 'Équipe';
}

function teamKeyFromMatch(match) {
  return String(match?.club?.cl_no || teamNameFromMatch(match));
}

function matchIsClubTeam(match, teamNumber) {
  return (
    (match.home?.club?.cl_no === CLUB_ID && Number(match.home?.number) === teamNumber) ||
    (match.away?.club?.cl_no === CLUB_ID && Number(match.away?.number) === teamNumber)
  );
}

function matchMatchesResultsFilter(match, filter) {
  if (filter === 'team-1') return matchIsClubTeam(match, 1);
  if (filter === 'team-2') return matchIsClubTeam(match, 2);
  return matchIsClubTeam(match, 1) || matchIsClubTeam(match, 2);
}

function matchMatchesCalendarFilter(match, filter) {
  if (filter === 'team-1') return matchIsClubTeam(match, 1);
  if (filter === 'team-2') return matchIsClubTeam(match, 2);
  return matchIsClubTeam(match, 1) || matchIsClubTeam(match, 2);
}
function buildStandings(matches) {
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

function setActivePage(page) {
  state.page = page;
  pageSections.forEach((section) => section.classList.toggle('is-visible', section.dataset.page === page));

  [...primaryNav.querySelectorAll('[data-page]')].forEach((button) => {
    button.classList.toggle('is-active', button.dataset.page === page);
  });

  renderSubnav();
}

function renderPrimaryNav() {
  primaryNav.innerHTML = NAV_ITEMS.map((item) => `
    <button class="nav-link" data-page="${item.page}" type="button">${item.label}</button>
  `).join('');

  primaryNav.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      setActivePage(button.dataset.page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function renderSubnav() {
  const items = SUBNAV[state.page] || [];
  subnav.innerHTML = items.map((item) => {
    if (item.filter) {
      const active = state.page === 'calendar'
        ? state.calendarFilter === item.filter
        : state.page === 'results'
          ? state.resultsFilter === item.filter
          : state.page === 'standings'
            ? state.standingsFilter === item.filter
          : false;
      const dataAttr = state.page === 'results'
        ? 'data-results-filter'
        : state.page === 'standings'
          ? 'data-standings-filter'
          : 'data-calendar-filter';
      return `<button class="subnav__item ${active ? 'is-active' : ''}" ${dataAttr}="${item.filter}" type="button">${item.label}</button>`;
    }
    if (item.page) {
      return `<button class="subnav__item" data-page-link="${item.page}" type="button">${item.label}</button>`;
    }
    if (item.target) {
      return `<button class="subnav__item" data-target="${item.target}" type="button">${item.label}</button>`;
    }
    return `<span class="subnav__item subnav__item--static">${item.text || item.label}</span>`;
  }).join('');

  subnav.querySelectorAll('[data-calendar-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      setCalendarFilter(button.dataset.calendarFilter);
    });
  });

  subnav.querySelectorAll('[data-results-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      setResultsFilter(button.dataset.resultsFilter);
    });
  });

  subnav.querySelectorAll('[data-standings-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      setStandingsFilter(button.dataset.standingsFilter);
    });
  });

  subnav.querySelectorAll('[data-page-link]').forEach((button) => {
    button.addEventListener('click', () => {
      setActivePage(button.dataset.pageLink);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  subnav.querySelectorAll('[data-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.target);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function setDataStatus(message, tone = 'loading') {
  if (!dataStatus) return;
  dataStatus.textContent = message;
  dataStatus.classList.toggle('badge--error', tone === 'error');
  dataStatus.classList.toggle('badge--ghost', tone !== 'error');
}

function setCalendarFilter(filter) {
  state.calendarFilter = filter;
  renderSubnav();
  renderLists();
}

function setResultsFilter(filter) {
  state.resultsFilter = filter;
  renderSubnav();
  renderLists();
}

function setStandingsFilter(filter) {
  state.standingsFilter = filter;
  renderSubnav();
  renderStandings();
}

function fmtDate(value) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).format(date);
}

function fmtTime(value) {
  return value || '';
}

function renderMatch(match) {
  const home = match.home?.short_name || 'Domicile';
  const away = match.away?.short_name || 'Extérieur';
  const scoreHome = match.home_score ?? '-';
  const scoreAway = match.away_score ?? '-';
  const status = match.status_label || match.status || '';
  return `
    <article class="list-item list-item--match">
      <div class="list-item__grid">
        <div>
          <div class="list-item__date">${fmtDate(match.date || match.initial_date)}</div>
          <div class="muted">${fmtTime(match.time)}</div>
        </div>
        <div class="list-item__teams">
          <strong>${home} <span class="muted">vs</span> ${away}</strong>
          <div class="list-item__meta-row">
            <span class="pill">${match.competition?.name || 'Compétition'}</span>
            <span class="pill">${match.poule?.name || 'Poule'}</span>
            <span class="pill">${match.terrain?.city || 'Lieu à confirmer'}</span>
          </div>
        </div>
        <div class="list-item__score">${scoreHome} - ${scoreAway}</div>
      </div>
      <div class="list-item__subtitle">${status || 'Match'}</div>
    </article>
  `;
}

function renderTeam(team) {
  const engagements = (team.engagements || []).slice(0, 4).map((e) => e.competition?.name).filter(Boolean);
  return `
    <article class="team-card ${team.number === 1 ? 'team-card--featured' : ''}">
      <div class="team-card__top">
        <strong>${team.number === 1 ? 'Équipe 1' : team.number === 2 ? 'Équipe 2' : `Équipe ${team.number || ''}`}</strong>
        <span class="pill">${team.category_label || team.category_code || 'Équipe'}</span>
      </div>
      <h3>${team.short_name || TEAM_FALLBACK_NAME}</h3>
      <div class="team-card__meta">
        <span class="pill">${team.category_gender || ''}</span>
        ${engagements.map((label) => `<span class="pill">${label}</span>`).join('')}
      </div>
    </article>
  `;
}

function renderTeams(listEl, teams) {
  listEl.innerHTML = teams.length ? teams.map(renderTeam).join('') : '<div class="card card--empty">Aucune équipe trouvée.</div>';
}

function renderStandingsTable(tbody, rows) {
  tbody.innerHTML = rows.length
    ? rows.map((row) => `
        <tr class="${row.clubNo === CLUB_ID ? 'is-club' : ''}">
          <td><span class="rank-badge">${row.rank}</span></td>
          <td><div class="team-name">${row.name}${row.clubNo === CLUB_ID ? '<span class="club-tag">ESSA</span>' : ''}</div></td>
          <td>${row.points}</td>
          <td>${row.played}</td>
          <td>${row.wins}</td>
          <td>${row.draws}</td>
          <td>${row.losses}</td>
          <td>${row.forfeits}</td>
          <td>${row.gf}</td>
          <td>${row.ga}</td>
          <td>${row.penalties}</td>
          <td>${row.diff > 0 ? `+${row.diff}` : row.diff}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="12" class="standings-empty">Aucun classement calculable pour le moment.</td></tr>';
}

function renderStandingsBlock({ title, metaId, countId, tableId, rows, extraHeader = '' }) {
  return `
    <article class="standings-block">
      <div class="section__title section__title--tight standings-block__head">
        <div>
          <h3>${title}</h3>
          <p class="muted" id="${metaId}">${rows.length ? `Classement calculé à la date de référence ${standingsAsOf}.` : 'Classement indisponible pour le moment.'}</p>
        </div>
        <span class="badge badge--ghost" id="${countId}">${rows.length} équipes</span>
        ${extraHeader}
      </div>
      <div class="table-wrap">
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Équipe</th>
              <th>Pts</th>
              <th>J</th>
              <th>G</th>
              <th>N</th>
              <th>P</th>
              <th>F</th>
              <th>BP</th>
              <th>BC</th>
              <th>Pé</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody id="${tableId}">
            ${rows.length ? rows.map((row) => `
              <tr class="${row.clubNo === CLUB_ID ? 'is-club' : ''}">
                <td><span class="rank-badge">${row.rank}</span></td>
                <td><div class="team-name">${row.name}${row.clubNo === CLUB_ID ? '<span class="club-tag">ESSA</span>' : ''}</div></td>
                <td>${row.points}</td>
                <td>${row.played}</td>
                <td>${row.wins}</td>
                <td>${row.draws}</td>
                <td>${row.losses}</td>
                <td>${row.forfeits}</td>
                <td>${row.gf}</td>
                <td>${row.ga}</td>
                <td>${row.penalties}</td>
                <td>${row.diff > 0 ? `+${row.diff}` : row.diff}</td>
              </tr>
            `).join('') : '<tr><td colspan="12" class="standings-empty">Aucun classement calculable pour le moment.</td></tr>'}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderStandings() {
  const team1Rows = state.standings.team1 || [];
  const team2Rows = (state.standings.team2 || {})[state.standingsTeam2Level] || [];
  const showTeam1 = state.standingsFilter === 'all' || state.standingsFilter === 'team-1';
  const showTeam2 = state.standingsFilter === 'all' || state.standingsFilter === 'team-2';
  const standingsStack = document.querySelector('.standings-stack');
  if (!standingsStack) return;

  standingsStack.innerHTML = [
    showTeam1 ? renderStandingsBlock({ title: 'Équipe 1', metaId: 'standings-team1-meta', countId: 'standings-team1-count', tableId: 'standings-team1-table', rows: team1Rows }) : '',
    showTeam2 ? renderStandingsBlock({
      title: 'Équipe 2',
      metaId: 'standings-team2-meta',
      countId: 'standings-team2-count',
      tableId: 'standings-team2-table',
      rows: team2Rows,
      extraHeader: `
        <div class="standings-switch" role="tablist" aria-label="Niveau de l'équipe 2">
          <button class="chip chip--sm ${state.standingsTeam2Level === '1' ? 'chip--active' : ''}" data-standings-team2-level="1" type="button">1er niveau</button>
          <button class="chip chip--sm ${state.standingsTeam2Level === '2' ? 'chip--active' : ''}" data-standings-team2-level="2" type="button">2ème niveau</button>
        </div>
      `,
    }) : '',
  ].join('');

  document.querySelectorAll('[data-standings-team2-level]').forEach((button) => {
    button.addEventListener('click', () => {
      state.standingsTeam2Level = button.dataset.standingsTeam2Level;
      renderStandings();
    });
  });
}

function renderLists() {
  const calendarList = document.querySelector('#calendar-list');
  const resultsList = document.querySelector('#results-list');
  renderTeams(document.querySelector('#teams-list'), state.teams);

  const calendarMatches = state.calendar
    .filter((match) => matchMatchesCalendarFilter(match, state.calendarFilter))
    .sort(sortByDateAsc);
  const resultsMatches = state.matches
    .filter(hasResult)
    .filter((match) => matchMatchesResultsFilter(match, state.resultsFilter))
    .slice()
    .sort(sortByDateDesc);

  const groups = groupByDate(calendarMatches);
  const groupKeys = Object.keys(groups).sort();
  const showGroupCounts = state.calendarFilter === 'all';
  calendarList.innerHTML = groupKeys.length
    ? groupKeys.map((key) => `
        <div>
          <div class="group-title">
            <div>
              <div class="group-title__label">Journée</div>
              <div class="group-title__date">${formatGroupLabel(key)}</div>
            </div>
            ${showGroupCounts ? `<span class="badge badge--ghost">${groups[key].length} match${groups[key].length > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="list">${groups[key].map(renderMatch).join('')}</div>
        </div>
      `).join('')
    : '<div class="card card--empty">Aucune rencontre à afficher.</div>';

  resultsList.innerHTML = resultsMatches.length ? resultsMatches.map(renderMatch).join('') : '<div class="card card--empty">Aucun résultat à afficher.</div>';

  const next = state.calendar[0];
  const last = resultsMatches[0];
  document.querySelector('#calendar-count').textContent = `${calendarMatches.length} matchs`;
  document.querySelector('#results-count').textContent = `${resultsMatches.length} résultats`;
  document.querySelector('#next-match-title').textContent = next ? `${next.home?.short_name || ''} vs ${next.away?.short_name || ''}` : 'Aucune rencontre à venir';
  document.querySelector('#next-match-details').textContent = next ? `${next.competition?.name || ''} · ${fmtDate(next.date)} ${fmtTime(next.time)}` : 'Calendrier non disponible';
  document.querySelector('#next-match-status').textContent = next ? (next.status_label || next.status || '') : '';
  document.querySelector('#last-result-title').textContent = last ? `${last.home?.short_name || ''} ${last.home_score ?? '-'} - ${last.away_score ?? '-'} ${last.away?.short_name || ''}` : 'Aucun résultat';
  document.querySelector('#last-result-details').textContent = last ? `${last.competition?.name || ''} · ${fmtDate(last.date)} ${fmtTime(last.time)}` : 'Résultats non disponibles';

  const meta = document.querySelector('#next-match-meta');
  meta.innerHTML = next ? [next.terrain?.city, next.terrain?.name, next.poule?.name].filter(Boolean).map((value) => `<span class="pill">${value}</span>`).join('') : '';

  document.querySelector('#stat-teams').textContent = `${state.teams.length}`;
  document.querySelector('#stat-calendar').textContent = `${state.calendar.length}`;
  document.querySelector('#stat-results').textContent = `${state.matches.length}`;
}

async function loadJson(path) {
  const response = await fetch(path, { headers: { Accept: 'application/ld+json, application/json;q=0.9, */*;q=0.8' } });
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${path} -> invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
}

async function loadCollection(path, { page = 1 } = {}) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('page', String(page));
  const payload = await loadJson(url.pathname + url.search);
  const members = payload['hydra:member'] || [];
  const totalItems = Number(payload['hydra:totalItems'] || members.length || 0);
  const hasMore = members.length > 0 && members.length < totalItems;

  if (!hasMore) return members;

  const nextPage = page + 1;
  const nextMembers = await loadCollection(path, { page: nextPage });
  return members.concat(nextMembers);
}

async function loadData() {
  const cachedSnapshot = readCache();
  if (cachedSnapshot) {
    applySnapshot(cachedSnapshot);
    setDataStatus('Dernières données mises en cache');
  } else {
    setDataStatus('Chargement des données du club...');
  }

  const [club, matches, teams, team1Matches, team2Level1Matches, team2Level2Matches] = await Promise.allSettled([
    loadJson(`/api/clubs/${CLUB_ID}`),
    loadCollection(`/api/clubs/${CLUB_ID}/matchs`),
    loadJson(`/api/clubs/${CLUB_ID}/equipes`),
    loadCollection(`/api/compets/436831/phases/1/poules/1/matchs`),
    loadCollection(`/api/compets/436833/phases/1/poules/1/matchs`),
    loadCollection(`/api/compets/448025/phases/1/poules/1/matchs`),
  ]);

  const failures = [club, matches, teams, team1Matches, team2Level1Matches, team2Level2Matches].filter((result) => result.status === 'rejected');
  const value = (result, fallback) => (result.status === 'fulfilled' ? result.value : fallback);
  const cachedStandings = cachedSnapshot?.standings || { team1: [], team2: { 1: [], 2: [] } };

  const clubData = value(club, cachedSnapshot?.club || {});
  const matchesData = value(matches, cachedSnapshot?.matches || []);
  const teamsData = value(teams, { 'hydra:member': cachedSnapshot?.teams || [] });
  const team1Data = value(team1Matches, cachedStandings.team1 || []);
  const team2Level1Data = value(team2Level1Matches, cachedStandings.team2?.[1] || []);
  const team2Level2Data = value(team2Level2Matches, cachedStandings.team2?.[2] || []);

  state.club = clubData;
  state.matches = Array.isArray(matchesData) ? matchesData : (matchesData['hydra:member'] || []);
  state.calendar = state.matches.filter(isUpcoming).sort(sortByDateAsc);
  state.teams = teamsData['hydra:member'] || [];
  state.standings = {
    team1: buildStandings(team1Data.filter(hasResult).filter(isOnOrBeforeAsOf)),
    team2: {
      1: buildStandings(team2Level1Data.filter(hasResult).filter(isOnOrBeforeAsOf)),
      2: buildStandings(team2Level2Data.filter(hasResult).filter(isOnOrBeforeAsOf)),
    },
  };

  applySnapshot(snapshotState());
  const heroImage = document.querySelector('#hero-image');
  if (heroImage) heroImage.dataset.visual = 'future-image-slot';

  writeCache(snapshotState());

  if (failures.length > 0 && cachedSnapshot) {
    setDataStatus(failures.length === 6 ? 'Données affichées depuis le cache' : 'Données mises à jour partiellement depuis l’API');
  } else if (failures.length > 0) {
    setDataStatus(`${failures.length} source${failures.length > 1 ? 's' : ''} indisponible${failures.length > 1 ? 's' : ''}`, 'error');
  } else {
    setDataStatus('Données chargées');
  }
}

document.querySelectorAll('[data-page-link]').forEach((button) => {
  button.addEventListener('click', () => {
    const page = button.dataset.pageLink;
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

document.querySelector('#enter-site')?.addEventListener('click', () => {
  setActivePage('calendar');
  document.getElementById('page-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelectorAll('.topbar__nav [data-page]').forEach((button) => {
  button.addEventListener('click', () => {
    setActivePage(button.dataset.page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

subnav.addEventListener('click', (event) => {
  const targetButton = event.target.closest('[data-target]');
  if (!targetButton) return;
  const target = document.getElementById(targetButton.dataset.target);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

setActivePage('home');
setCalendarFilter('all');
setStandingsFilter('all');
renderPrimaryNav();
setActivePage('home');
renderSubnav();
loadData().catch((error) => {
  console.error(error);
  document.querySelector('#club-meta').textContent = 'Erreur de chargement des données API';
  setDataStatus('Chargement impossible', 'error');
  document.querySelector('#club-logo-top').src = clubLogoSrc;
});
