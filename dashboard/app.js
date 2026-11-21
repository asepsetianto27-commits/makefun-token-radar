/* Token Radar's dashboard, model radar-3: the board, the live set, the
   calibration table, and the model, in one page. It reads window.RADAR
   (written beside dashboard/ by main.ts) and renders from it. No network:
   every byte it shows is in data.js. The farm plan and the implied value
   are the same derivation main.ts writes to board.json: category, chains,
   TVL and age decide the action, the capital, the hold, every cost and
   time, and the category multiple the snapshot's own live protocols set.
   No name is special-cased. */
(function () {
  'use strict';
  var DATA = window.RADAR;
  var app = document.getElementById('board');
  if (!DATA || !app) return;

  var state = { q: '', category: 'all', chain: 'all', watch: false, tab: 'pre-token', sort: 'implied', dir: -1, selected: null };

  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd0.format(n);
  }
  function fmtFull(n) { return usd0.format(n); }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    if (days >= 30) return Math.floor(days / 30) + 'mo';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) { return n.toFixed(3); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* The model, mirrored from the server side: the same figures, the same rounding. */
  function categoryMultiple(row) { return row.category_multiple !== undefined && row.category_multiple !== null ? row.category_multiple : DATA.model.base_multiple; }
  function impliedOf(row, model) {
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    var breadth = 1 + Math.min(Math.max((row.chains || []).length - 1, 0), model.breadth_max_chains) * model.breadth_per_chain;
    return Math.max(1, Math.round(row.tvl_usd * categoryMultiple(row) * growthMult * maturity * breadth));
  }
  function capitalFor(row) {
    if (row.tvl_usd >= 1e9) return 250;
    if (row.tvl_usd >= 5e8) return 150;
    if (row.tvl_usd >= 2e8) return 100;
    return 50;
  }
  function gasFor(row) {
    if (row.chains.length > 0 && row.chains.every(function (c) { return c === 'Ethereum'; })) return 20;
    if (row.chains.length > 0 && row.chains.every(function (c) { return c === 'Solana'; })) return 1;
    return 5;
  }
  function holdDaysFor(age) {
    if (age !== null && age !== undefined && age >= 730) return 60;
    if (age !== null && age !== undefined && age >= 365) return 45;
    return 30;
  }
  /* Implied value per $100 farmed: the board's efficiency measure. */
  function efficiencyOf(row) { return row.implied_value_usd / capitalFor(row) * 100; }

  var ACTION_VERBS = {
    Lending: 'lend and borrow a little on the lending market',
    CDP: 'open a small collateralised-debt position',
    Dexs: 'swap through the pool and add a little liquidity',
    Derivatives: 'open a small hedged position',
    Yield: 'deposit into the yield vault',
    'Yield Aggregator': 'deposit into the vault',
    RWA: 'buy the tokenised asset share',
    'Risk Curators': 'deposit into the curated vault',
    'Onchain Capital Allocator': 'deposit into the allocation vault',
    'Liquid Restaking': 'stake the restaked asset',
    Insurance: 'buy a small cover policy',
    Options: 'open a small covered option position',
    Perpetuals: 'open a small hedged perpetual position',
    'Prediction Market': 'take a small position in a market',
    Indexes: 'buy the index token',
    Launchpad: 'join the launch pool with a small amount',
    Gaming: 'play the game with the smallest stake',
    NFT: 'buy the cheapest NFT in the collection',
    'Liquid Staking': 'stake a small amount',
    Bridge: 'bridge a small amount to another chain',
    Stablecoins: 'hold the stablecoin',
    'Basis Trading': 'open a small basis position',
    Synthetics: 'mint a small synthetic position',
    'Tokenized T-Bills': 'buy a share of the tokenised T-bill',
    Farming: 'join the farm with a small stake',
    'Money Markets': 'deposit into the money market',
    Vaults: 'deposit into the vault',
    Restaking: 'stake the restaked asset'
  };
  function actionFor(row, capital) {
    var verb = row.category ? ACTION_VERBS[row.category] : undefined;
    return verb !== undefined ? verb : 'use the protocol\'s main feature with $' + capital + ' and hold';
  }
  function recurringActionFor(row, capital, chain) {
    var c = row.category || '';
    if (c === 'Lending' || c === 'CDP' || c === 'Money Markets') return 'Once a month, repay a small part of the borrow and borrow it again on ' + chain + ' so the position shows fresh activity.';
    if (c === 'Dexs' || c === 'AMM') return 'Swap $' + Math.min(10, capital) + ' through the pool on ' + chain + ' once a week so the position keeps earning fees and shows weekly use.';
    if (c === 'Yield' || c === 'Yield Aggregator' || c === 'Vaults' || c === 'Risk Curators' || c === 'Onchain Capital Allocator') return 'Claim and restake the vault yield on ' + chain + ' once a month instead of letting it sit idle.';
    if (c === 'Derivatives' || c === 'Perpetuals' || c === 'Synthetics' || c === 'Basis Trading') return 'Close and reopen the hedge on ' + chain + ' once a month so the margin account shows fresh trades.';
    if (c === 'Options') return 'Roll the covered position on ' + chain + ' once before it expires so the collateral keeps working.';
    if (c === 'Prediction Market') return 'Take one more small position each month on ' + chain + ' in a market that settles within the week.';
    if (c === 'Stablecoins' || c === 'RWA' || c === 'Tokenized T-Bills') return 'Check the yield payout on ' + chain + ' each month and keep the asset held for the full period.';
    if (c === 'Insurance') return 'Renew the cover on ' + chain + ' before it lapses so the policy never has a gap.';
    if (c === 'Indexes') return 'Rebalance the index holding on ' + chain + ' once a month if the index adds or drops a token.';
    if (c === 'Launchpad') return 'Join one more sale each month on ' + chain + ' while the launch pool is open.';
    if (c === 'Gaming' || c === 'NFT') return 'Use the app on ' + chain + ' once a week so the account shows weekly activity.';
    if (c === 'Bridge' || c === 'Canonical Bridge') return 'Bridge a small amount back to ' + chain + ' once a month so the route shows two-way use.';
    return 'Use the protocol\'s main feature on ' + chain + ' once a week so the position shows steady activity.';
  }
  function stepText(text) {
    var t = text.trim();
    if (t.length >= 20) return t.slice(0, 600);
    return (t + ' Keep a record of the transaction hash and the date.').slice(0, 600);
  }
  function farmSteps(row) {
    var capital = capitalFor(row);
    var gas = gasFor(row);
    var chain = row.chains[0] || 'the protocol';
    var secondChain = row.chains.length > 1 ? row.chains[1] : chain;
    var hold = holdDaysFor(row.age_days);
    return [
      { text: stepText('Open a fresh wallet for this protocol only, so its activity is separate from other farms. Fund it with $' + capital + ' plus about $' + gas + ' for gas, and write down the address.'), cost: '$' + (capital + gas), time: '5 min' },
      { text: stepText('On ' + chain + ', ' + actionFor(row, capital) + '. Do it in one transaction, keep the receipt, and check the position shows in the protocol\'s own interface before moving on.'), cost: '$' + capital, time: '15 min' },
      { text: stepText(recurringActionFor(row, capital, secondChain)), cost: 'about $2 of gas', time: '10 min a week' },
      { text: stepText('Hold the position for ' + hold + ' days. Do not withdraw early: an early exit looks like a hunter\'s wallet, and the position is worth more as a record of use than as idle capital.'), cost: '$0', time: hold + ' days' },
      { text: stepText('Check whether the protocol announces a token or a points programme. If it does, read its own rules before claiming anything, and never pay a third party to claim for you.'), cost: '$0', time: '10 min' },
      { text: stepText('Write down the date, the transaction hashes, and the model\'s implied value of ' + fmtFull(row.implied_value_usd) + ' for ' + row.name + ' as of this snapshot, so the farm can be judged later against what actually launched.'), cost: '$0', time: '5 min' }
    ];
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('watch') === '1') state.watch = true;
    if (params.get('tab')) state.tab = params.get('tab');
    if (params.get('p')) state.selected = params.get('p');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.watch) params.set('watch', '1');
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.watch && !r.on_watchlist) return false;
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && !(r.chains || []).includes(state.chain)) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'efficiency') { av = efficiencyOf(a); bv = efficiencyOf(b); }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function optionList(values, current, label) {
    var out = '<option value="all">All ' + esc(label) + '</option>';
    values.forEach(function (v) { out += '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(v) + '</option>'; });
    return out;
  }
  function header() {
    return '<header class="top"><div class="brand"><span class="mark" aria-hidden="true"></span><span>TOKEN RADAR</span></div>' +
      '<div class="top-meta"><span>Snapshot <b>' + esc(DATA.as_of) + '</b></span><span>Source <b>DefiLlama protocol index</b></span><span>Model <b>' + esc(DATA.model_version) + '</b></span></div></header>';
  }
  function lede() {
    var top = DATA.rows[0];
    var cal = DATA.calibration;
    return '<section class="lede"><div><h1>Which pre-token protocol is worth farming next? <em>' + esc(top ? top.name : '—') + '</em> leads the board.</h1>' +
      '<p>The watchlist is the floor: every protocol with at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL and no token on record. The early radar adds ' + DATA.early_size + ' pre-token protocols below that floor. Each category is now priced at the multiple its own live tokens command — ' + cal.by_category.length + ' categories calibrated from this snapshot, the rest at the global median of ' + fmtMult(cal.global_multiple) + '. Implied value is a model, not a promise — and "records no token" is never proof a protocol has none.</p></div>' +
      '<div class="facts">' +
      '<div class="fact"><span>Watchlist covered</span><b>' + DATA.watchlist_size + ' <small>/ ' + DATA.watchlist_size + '</small></b></div>' +
      '<div class="fact"><span>Pre-token rows scored</span><b>' + DATA.board_size + '</b></div>' +
      '<div class="fact"><span>Early rows below the floor</span><b>' + DATA.early_size + '</b></div>' +
      '<div class="fact"><span>Live-token set aside</span><b>' + DATA.live_size + '</b></div></div></section>';
  }
  function spotlight() {
    var top = DATA.rows.slice(0, 3);
    var medals = ['gold', 'silver', 'bronze'];
    var cards = top.map(function (row, i) {
      return '<article class="spot spot-' + medals[i] + '"><div class="spot-rank">#' + row.rank + '</div>' +
        '<h3><a href="#p=' + esc(row.slug) + '" data-select="' + esc(row.slug) + '">' + esc(row.name) + '</a></h3>' +
        '<p class="spot-cat">' + esc(row.category || 'No category') + ' · ' + row.chains.map(esc).join(', ') + '</p>' +
        '<p class="spot-value">' + fmtFull(row.implied_value_usd) + '</p>' +
        '<p class="spot-sub">implied value · TVL ' + fmtUsd(row.tvl_usd) + ' · ' + fmtPct(row.change_7d) + ' in 7 days</p>' +
        '<p class="spot-eff">' + fmtUsd(Math.round(efficiencyOf(row))) + ' of implied value per $100 farmed</p></article>';
    }).join('');
    return '<section class="spotlight" aria-label="Top three protocols"><h2>Top of the board</h2><div class="spot-grid">' + cards + '</div></section>';
  }
  function controls() {
    var cats = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var count = state.tab === 'pre-token' ? filteredRows().length + ' of ' + DATA.board_size + ' rows shown' : DATA.live.length + ' live-token protocols';
    return '<div class="controls">' +
      '<div class="field"><label for="q">Search</label><input type="search" id="q" placeholder="Search protocols" value="' + esc(state.q) + '" aria-label="Search the board"></div>' +
      '<div class="field"><label for="category">Category</label><select id="category" aria-label="Filter by category">' + optionList(cats, state.category, 'categories') + '</select></div>' +
      '<div class="field"><label for="chain">Chain</label><select id="chain" aria-label="Filter by chain">' + optionList(chains, state.chain, 'chains') + '</select></div>' +
      '<label class="check" for="watch"><input type="checkbox" id="watch"' + (state.watch ? ' checked' : '') + '> Watchlist only</label>' +
      '<div class="field"><span class="sub">Token status</span><div class="tabs">' +
      '<button type="button" data-tab="pre-token" aria-pressed="' + (state.tab === 'pre-token') + '">Pre-token</button>' +
      '<button type="button" data-tab="live" aria-pressed="' + (state.tab === 'live') + '">Live token</button></div></div>' +
      '<span class="count">' + esc(count) + '</span></div>';
  }

  function sortHeader(key, label) {
    var arrow = state.sort === key ? (state.dir < 0 ? ' ▼' : ' ▲') : '';
    return '<th scope="col"><button type="button" data-sort="' + key + '">' + esc(label) + (arrow ? '<span aria-hidden="true">' + arrow + '</span>' : '') + '</button></th>';
  }
  function boardTable() {
    var list = sortedRows(filteredRows());
    if (list.length === 0) {
      return '<div class="panel"><div class="empty"><h2>No protocol matches that filter</h2>' +
        '<p>Clear the search or pick another category or chain to see the board again.</p>' +
        '<button class="button primary" type="button" data-clear="1">Clear filters</button></div></div>';
    }
    var max = DATA.rows.length ? DATA.rows[0].implied_value_usd : 1;
    var rowsHtml = list.map(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var bar = Math.max(3, Math.round(Math.sqrt(r.implied_value_usd / max) * 100));
      var rankCls = r.rank <= 3 ? ' rank-' + r.rank : '';
      return '<tr data-slug="' + esc(r.slug) + '" data-selected="' + (state.selected === r.slug) + '" tabindex="0">' +
        '<td class="num"><span class="rank' + rankCls + '">' + r.rank + '</span></td>' +
        '<td><div class="name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.category || 'Other') + ' on ' + esc(r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') + '</span></div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num ' + growthClass + '">' + growth + '</td>' +
        '<td class="num">' + fmtAge(r.age_days) + '</td>' +
        '<td><div class="implied"><div class="bar" aria-hidden="true"><i style="width:' + bar + '%"></i></div><span class="num">' + fmtUsd(r.implied_value_usd) + '</span></div></td>' +
        '<td class="num">' + fmtUsd(Math.round(efficiencyOf(r))) + '</td>' +
        '<td><span class="' + (r.on_watchlist ? 'badge watch' : 'badge') + '">' + (r.on_watchlist ? 'Watchlist' : 'Early') + '</span></td></tr>';
    }).join('');
    return '<div class="panel"><div class="table-wrap"><table>' +
      '<caption>Pre-token protocols, strongest implied value first. Select a row for its model and farm plan. Bars use a square-root scale, so a protocol worth a tenth of the leader still shows a bar; the numbers are exact.</caption>' +
      '<thead><tr>' + sortHeader('implied', 'Rank') + sortHeader('name', 'Protocol') + sortHeader('tvl', 'TVL') + sortHeader('growth', '7d') + sortHeader('age', 'Age') + sortHeader('implied', 'Implied value') + sortHeader('efficiency', 'Value / $100') + '<th scope="col">Board</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table></div></div>';
  }
  function liveTable() {
    var rowsHtml = DATA.live.map(function (r) {
      return '<tr tabindex="0"><td><span class="badge live">Live</span></td>' +
        '<td><div class="name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.category || 'Other') + ' on ' + esc(r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') + '</span></div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</td>' +
        '<td class="num">' + fmtUsd(r.mcap_usd) + '</td>' +
        '<td><span class="sub">already trades</span></td></tr>';
    }).join('');
    return '<div class="panel"><div class="table-wrap"><table>' +
      '<caption>Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking.</caption>' +
      '<thead><tr><th scope="col">Status</th><th scope="col">Protocol</th><th scope="col">TVL</th><th scope="col">7d</th><th scope="col">Market cap</th><th scope="col">Token</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table></div></div>';
  }
  function calibrationPanel() {
    var cal = DATA.calibration;
    var calibratedRows = DATA.rows.filter(function (r) { return r.calibrated; }).length;
    var rowsHtml = '<tr class="global"><td>Global median (fallback)</td><td class="num">' + fmtMult(cal.global_multiple) + '</td><td class="num">' + cal.global_comps + '</td></tr>' +
      cal.by_category.map(function (e) {
        return '<tr><td>' + esc(e.category) + '</td><td class="num">' + fmtMult(e.multiple) + '</td><td class="num">' + e.comps + '</td></tr>';
      }).join('');
    return '<section class="panel cal"><h2>How each category is priced</h2>' +
      '<p>The multiple is the median market-cap-to-TVL ratio of the live-token protocols in that category, in this snapshot. A category needs at least ' + DATA.model.calibration_min_comps + ' live protocols to set its own multiple; the rest use the global median. Every multiple is clamped to ' + DATA.model.calibration_min_multiple + '–' + DATA.model.calibration_max_multiple + ', so one wild ratio never carries a category.</p>' +
      '<div class="table-wrap"><table><caption>Category multiples, highest first. ' + calibratedRows + ' of ' + DATA.board_size + ' rows are priced at their own category multiple; the other ' + (DATA.board_size - calibratedRows) + ' use the global median.</caption>' +
      '<thead><tr><th scope="col">Category</th><th scope="col">Multiple</th><th scope="col">Live protocols</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
      '<p class="note">The calibration is the market talking: a lending protocol is priced at what lending tokens trade for, not at the same rate as a derivatives exchange. It also has a limit — the median of three live protocols is still a small sample, and a category with no live token at all has no market price to learn from.</p></section>';
  }
  function modelPanel() {
    var m = DATA.model;
    return '<section class="panel model"><h2>How implied value is computed</h2>' +
      '<p>Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked.</p>' +
      '<div class="formula">implied = round( tvl_usd x categoryMultiple x (1 + clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100 x ' + m.growth_weight + ')' +
      ' x (' + m.maturity_floor + ' + min(age_days, ' + m.maturity_days + ') / ' + m.maturity_days + ' x ' + m.maturity_range + ')' +
      ' x (1 + min(chains - 1, ' + m.breadth_max_chains + ') x ' + m.breadth_per_chain + ') )</div>' +
      '<p><b>categoryMultiple</b> is the median market-cap-to-TVL ratio of the live-token protocols in the same category, when at least ' + m.calibration_min_comps + ' of them trade in this snapshot; otherwise it is the global median across all live protocols, ' + fmtMult(DATA.calibration.global_multiple) + '. Every multiple is clamped to ' + m.calibration_min_multiple + '–' + m.calibration_max_multiple + '. The base multiple ' + m.base_multiple + ' is used only when the snapshot holds no live comparable at all.</p>' +
      '<p>TVL and seven-day growth come from the snapshot. Age is the time since the protocol was first listed, the best record of how long it has run with no token; an unlisted age uses ' + m.unknown_age_days + ' days. Chain breadth rewards protocols whose TVL sits on more than one chain, capped at ' + (1 + m.breadth_max_chains * m.breadth_per_chain) + 'x. Wrapped, staked and bridged products of tokens that already trade are kept out of the board by the same test the watchlist applies.</p></section>';
  }
  function selectRow(slug) {
    state.selected = state.selected === slug ? null : slug;
    writeHash();
    render();
    if (state.selected) {
      var d = document.getElementById('detail');
      if (d) d.scrollIntoView({ block: 'start' });
    }
  }
  function detailPanel() {
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === state.selected) row = r; });
    if (!row) return '';
    var steps = farmSteps(row);
    var recomputed = impliedOf(row, DATA.model);
    var agree = recomputed === row.implied_value_usd;
    var above = row.rank > 1 ? DATA.rows[row.rank - 2] : null;
    var below = row.rank < DATA.rows.length ? DATA.rows[row.rank] : null;
    var multNote = row.calibrated
      ? 'the median of ' + row.category_comps + ' live ' + (row.category || 'Other') + ' protocols'
      : 'the global median of ' + row.category_comps + ' live protocols — too few live ' + (row.category || 'Other') + ' protocols to set their own multiple';
    var why = 'Rank ' + row.rank + ': its TVL of ' + fmtFull(row.tvl_usd) + ' at a ' + (row.category || 'Other') + ' multiple of ' + fmtMult(categoryMultiple(row)) + ' puts its implied value at ' + fmtFull(row.implied_value_usd) + '.';
    if (above) why += ' Ahead of it, #' + above.rank + ' ' + above.name + ' at ' + fmtFull(above.implied_value_usd) + '.';
    if (below) why += ' Behind it, #' + below.rank + ' ' + below.name + ' at ' + fmtFull(below.implied_value_usd) + '.';
    var stepsHtml = steps.map(function (s) { return '<li><b>' + esc(s.text) + '</b><span class="cost">Cost: ' + esc(s.cost) + ' · Time: ' + esc(s.time) + '</span></li>'; }).join('');
    return '<section class="panel detail" id="detail" aria-label="Protocol detail"><div class="detail-head"><div>' +
      '<span class="rankline">Rank ' + row.rank + ' of ' + DATA.board_size + (row.on_watchlist ? ' · Watchlist' : ' · Early radar') + '</span>' +
      '<h2>' + esc(row.name) + '</h2>' +
      '<p class="sub">' + esc(row.category || 'Other') + ' on ' + esc(row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') + '</p></div>' +
      '<button class="close" type="button" data-close="1">Close</button></div>' +
      '<p class="why">' + esc(why) + '</p>' +
      '<h3>Implied value</h3><div class="equation">' +
      '<div><span>TVL</span><b>' + fmtFull(row.tvl_usd) + '</b></div>' +
      '<div><span>Seven-day growth</span><b>' + fmtPct(row.change_7d) + '</b></div>' +
      '<div><span>Age with no token</span><b>' + fmtAge(row.age_days) + '</b></div>' +
      '<div><span>Category multiple</span><b>' + fmtMult(categoryMultiple(row)) + '</b><span class="eq-note">' + esc(multNote) + '</span></div>' +
      '<div><span>Growth multiplier</span><b>' + row.growth_multiplier + '</b></div>' +
      '<div><span>Maturity multiplier</span><b>' + row.maturity_multiplier + '</b></div>' +
      '<div><span>Breadth multiplier</span><b>' + row.breadth_multiplier + '</b></div>' +
      '<div><span>Value per $100 farmed</span><b>' + fmtUsd(Math.round(efficiencyOf(row))) + '</b></div>' +
      '<div class="hot"><span>Implied value</span><b>' + fmtFull(row.implied_value_usd) + '</b></div></div>' +
      '<p class="sub">Model ' + esc(DATA.model_version) + ': the same function scores every protocol. The page recomputes this row as ' + fmtFull(recomputed) + (agree ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price.</p>' +
      '<h3>Farm plan</h3><ol class="steps">' + stepsHtml + '</ol>' +
      '<p class="note">This protocol records no token in the snapshot. That is the record, not proof it has none: check the protocol’s own pages before you farm it, and never pay anyone to claim an airdrop.</p></section>';
  }
  function footer() {
    return '<footer class="foot"><p>Source: ' + esc(DATA.source) + '. Snapshot ' + esc(DATA.as_of) + '. The board is this entry’s own claim, never make.fun’s, and it predicts neither whether nor when a token is issued.</p>' +
      '<p>Built as a make.fun entry for the token-radar-01 bounty. The program that wrote this page runs with no network and the same snapshot every time.</p></footer>';
  }

  var searchFocus = false;
  function bind() {
    var q = document.getElementById('q');
    if (q) {
      q.addEventListener('input', function () { searchFocus = true; state.q = q.value; writeHash(); render(); });
      if (searchFocus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); searchFocus = false; }
    }
    var cat = document.getElementById('category');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
    var chn = document.getElementById('chain');
    if (chn) chn.addEventListener('change', function () { state.chain = chn.value; writeHash(); render(); });
    var watch = document.getElementById('watch');
    if (watch) watch.addEventListener('change', function () { state.watch = watch.checked; writeHash(); render(); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-tab]'), function (b) {
      b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); state.selected = null; writeHash(); render(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-sort]'), function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-sort');
        if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; }
        render();
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('tr[data-slug]'), function (tr) {
      tr.addEventListener('click', function () { selectRow(tr.getAttribute('data-slug')); });
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRow(tr.getAttribute('data-slug')); } });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-select]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); selectRow(a.getAttribute('data-select')); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', function () { state.selected = null; writeHash(); render(); });
    });
    var clear = app.querySelector('[data-clear]');
    if (clear) clear.addEventListener('click', function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watch = false; writeHash(); render(); });
  }
  function render() {
    var html = '<div class="shell">' + header() + lede();
    if (state.tab === 'pre-token') html += spotlight();
    html += controls();
    if (state.tab === 'pre-token') html += detailPanel();
    html += state.tab === 'pre-token' ? boardTable() : liveTable();
    if (state.tab === 'pre-token') html += calibrationPanel() + modelPanel();
    html += footer() + '</div>';
    app.innerHTML = html;
    bind();
    app.setAttribute('aria-busy', 'false');
  }

  readHash();
  render();
  window.addEventListener('hashchange', function () { readHash(); render(); });
})();
