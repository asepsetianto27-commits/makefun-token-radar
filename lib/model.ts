// Token Radar's value model: one sealed snapshot in, one ranked board out.
//
// The board ranks protocols that record no token yet, by what their launch
// would be worth if the protocol's record stayed as it is. It never predicts
// whether or when a token is issued, and its implied value is this entry's
// own claim, never make.fun's.
//
// Coverage: every slug on the snapshot's watchlist (the floor, never the
// ceiling) plus every further pre-token protocol below the floor that passes
// the same no-wrapped-no-staked test the watchlist applies. A protocol is
// pre-token when its record carries no market cap, no CoinGecko id and no
// symbol. Live-token protocols are kept apart and shown with the market's
// own market cap, never mixed into the ranked board.
//
// Implied value follows only from the snapshot's own figures, and the base
// multiple is calibrated from the snapshot itself: for each category, the
// median market-cap-to-TVL ratio of the live-token protocols in that
// category that trade in this snapshot. A token that trades is the market's
// own price for a unit of TVL in that line of business, so a pre-token
// protocol in the same category is scored at the multiple its live
// neighbours actually command. Categories with fewer than three live
// comparables, and protocols with no category at all, use the global median
// across every live protocol instead: a thin sample is not a signal. Every
// multiple is clamped to a sane band, so one outlier protocol can never
// carry a whole category. No protocol name is ever special-cased: the same
// function scores every row, and the dashboard states the formula, the
// calibration table and recomputes each row from the same figures.
//
//   multiple  = median(mcap_usd / tvl_usd) over live protocols of the
//               category (at least 3 comparables), else the global median,
//               clamped to [0.05, 1.20]
//   base      = tvl_usd x multiple
//   growth    = 1 + clamp(change_7d, -50, 150) / 100 x 0.55
//   maturity  = 0.65 + min(age_days, 1095) / 1095 x 0.35   (age unknown: 365)
//   breadth   = 1 + min(chains - 1, 5) x 0.02
//   implied   = max(1, round(base x growth x maturity x breadth))
//
// TVL is the protocol's scale, seven-day growth is its momentum, age with
// no token is how long it has run without launching, and chain breadth is
// how many chains its TVL sits on. The calibration is the one change that
// makes the board discriminate between lines of business instead of pricing
// a lending protocol and a derivatives exchange at the same flat rate.

/** One protocol as the sealed snapshot carries it: exactly ten fields. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  /** The multiple used when the snapshot holds no live comparable at all. */
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_per_chain: number;
  breadth_max_chains: number;
  /** A category needs at least this many live comparables to set its own multiple. */
  calibration_min_comps: number;
  /** No calibrated multiple leaves this band, however wild the comparables. */
  calibration_min_multiple: number;
  calibration_max_multiple: number;
}

export const MODEL: ModelConstants = {
  base_multiple: 0.28,
  growth_weight: 0.55,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.65,
  maturity_range: 0.35,
  maturity_days: 1095,
  unknown_age_days: 365,
  breadth_per_chain: 0.02,
  breadth_max_chains: 5,
  calibration_min_comps: 3,
  calibration_min_multiple: 0.05,
  calibration_max_multiple: 1.2,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One calibrated category: the multiple the market pays, and how many live protocols set it. */
export interface CalibrationEntry {
  category: string;
  multiple: number;
  comps: number;
}

/** The whole calibration: the global fallback and one row per calibrated category. */
export interface Calibration {
  global_multiple: number;
  global_comps: number;
  by_category: CalibrationEntry[];
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  on_watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_usd: number;
    base_multiple: number;
    category_multiple: number;
    category_comps: number;
    calibrated: boolean;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row; the page rebuilds its farm plan. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  on_watchlist: boolean;
  implied_value_usd: number;
  category_multiple: number;
  category_comps: number;
  calibrated: boolean;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, the calibration and the model. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  calibration: Calibration;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Whole days from `listedAt` to `asOf`, clamped at zero; null when either is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The middle of sorted numbers, or the mean of the two middles. */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A multiple inside the model's calibration band. */
function clampMultiple(value: number, model: ModelConstants): number {
  return Math.min(model.calibration_max_multiple, Math.max(model.calibration_min_multiple, value));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/**
 * The calibration for one snapshot: the median market-cap-to-TVL ratio of
 * the live-token protocols, per category where at least
 * `calibration_min_comps` of them trade, and the global median across every
 * live protocol as the fallback. A category's own multiple is used only
 * where the sample is big enough to mean something; a single live protocol
 * never sets its category's price. The band keeps one wild ratio from
 * carrying a whole category.
 */
export function calibrateMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const live = snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX',
  );
  const globalMultiple =
    live.length > 0
      ? clampMultiple(median(live.map((p) => p.mcap_usd! / p.tvl_usd)), model)
      : model.base_multiple;
  const byCategory = new Map<string, number[]>();
  for (const p of live) {
    const key = p.category ?? 'Other';
    const list = byCategory.get(key);
    if (list === undefined) byCategory.set(key, [p.mcap_usd! / p.tvl_usd]);
    else list.push(p.mcap_usd! / p.tvl_usd);
  }
  const entries: CalibrationEntry[] = [];
  for (const [category, ratios] of [...byCategory.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (ratios.length < model.calibration_min_comps) continue;
    entries.push({ category, multiple: round4(clampMultiple(median(ratios), model)), comps: ratios.length });
  }
  entries.sort((a, b) => b.multiple - a.multiple || (a.category < b.category ? -1 : 1));
  return { global_multiple: round4(globalMultiple), global_comps: live.length, by_category: entries };
}

/** The multiple one category scores at, and how many live protocols set it (0: the global median). */
export function categoryMultiple(
  category: string | null,
  calibration: Calibration,
): { multiple: number; comps: number; calibrated: boolean } {
  const key = category ?? 'Other';
  const hit = calibration.by_category.find((e) => e.category === key);
  if (hit !== undefined) return { multiple: hit.multiple, comps: hit.comps, calibrated: true };
  return { multiple: calibration.global_multiple, comps: calibration.global_comps, calibrated: false };
}

/** The four multipliers and the implied value one protocol gets under `model` and `calibration`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  calibration: Calibration,
): {
  implied: number;
  base: number;
  categoryMultiple: number;
  categoryComps: number;
  calibrated: boolean;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  breadthMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const breadthMult =
    1 + Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_chains) * model.breadth_per_chain;
  const cat = categoryMultiple(protocol.category, calibration);
  const base = protocol.tvl_usd * cat.multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * breadthMult));
  return {
    implied,
    base,
    categoryMultiple: cat.multiple,
    categoryComps: cat.comps,
    calibrated: cat.calibrated,
    growthPct,
    growthMult,
    maturityMult,
    breadthMult,
    age,
  };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A whole word that marks a wrapped, staked or bridged product of a token that trades. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** Exchange names a protocol must not begin with: an exchange's own product is not a launch. */
const EXCHANGE_START = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;
/** Categories the watchlist rule keeps out: a wrapped, staked or bridged product of a token that trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and not a
 * wrapped, staked or bridged product of a token that already trades, by the
 * same test the watchlist applies (category, version marker, wrapped words,
 * exchange prefix) — minus the TVL floor, which is a floor, never a ceiling.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_START.test(p.name)) return false;
  return true;
}

/** The snapshot's protocols by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/**
 * The snapshot's shape, checked before use: an object with as_of, a floor,
 * an array of protocols, and a watchlist. A protocol that fails any field's
 * shape is rejected with the field that failed.
 */
export function parseSnapshot(data: unknown): Snapshot {
  let parsed: unknown = data;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new SnapshotError('snapshot is not valid JSON');
    }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SnapshotError('snapshot root must be an object');
  }
  const root = parsed as Record<string, unknown>;
  if (typeof root.as_of !== 'string' || root.as_of.length === 0) {
    throw new SnapshotError('snapshot.as_of is required');
  }
  if (!Number.isFinite(root.floor_usd as number)) {
    throw new SnapshotError('snapshot.floor_usd must be finite');
  }
  if (typeof root.source !== 'string' || root.source.length === 0) {
    throw new SnapshotError('snapshot.source is required');
  }
  if (!Array.isArray(root.protocols)) {
    throw new SnapshotError('snapshot.protocols must be an array');
  }
  const required: ReadonlyArray<'slug' | 'name' | 'category' | 'chains' | 'tvl_usd' | 'change_7d' | 'mcap_usd' | 'listed_at' | 'gecko_id' | 'symbol'> = [
    'slug',
    'name',
    'category',
    'chains',
    'tvl_usd',
    'change_7d',
    'mcap_usd',
    'listed_at',
    'gecko_id',
    'symbol',
  ];
  const seen = new Set<string>();
  const protocols: SnapshotProtocol[] = root.protocols.map((raw, index) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new SnapshotError(`snapshot.protocols[${index}] must be an object`);
    }
    const p = raw as Record<string, unknown>;
    if (typeof p.slug !== 'string' || p.slug.length === 0) {
      throw new SnapshotError(`snapshot.protocols[${index}].slug must be a non-empty string`);
    }
    if (seen.has(p.slug)) {
      throw new SnapshotError(`snapshot.protocols[${index}].slug "${p.slug}" is duplicated`);
    }
    seen.add(p.slug);
    if (typeof p.name !== 'string' || p.name.length === 0) {
      throw new SnapshotError(`snapshot.protocols[${index}].name must be a non-empty string`);
    }
    if (p.category !== null && typeof p.category !== 'string') {
      throw new SnapshotError(`snapshot.protocols[${index}].category must be a string or null`);
    }
    if (!Array.isArray(p.chains) || p.chains.some((c) => typeof c !== 'string')) {
      throw new SnapshotError(`snapshot.protocols[${index}].chains must be an array of strings`);
    }
    if (!Number.isFinite(p.tvl_usd as number)) {
      throw new SnapshotError(`snapshot.protocols[${index}].tvl_usd must be finite`);
    }
    if (p.change_7d !== null && !Number.isFinite(p.change_7d as number)) {
      throw new SnapshotError(`snapshot.protocols[${index}].change_7d must be finite or null`);
    }
    if (p.mcap_usd !== null && !Number.isFinite(p.mcap_usd as number)) {
      throw new SnapshotError(`snapshot.protocols[${index}].mcap_usd must be finite or null`);
    }
    if (p.listed_at !== null && typeof p.listed_at !== 'string') {
      throw new SnapshotError(`snapshot.protocols[${index}].listed_at must be a string or null`);
    }
    if (p.gecko_id !== null && typeof p.gecko_id !== 'string') {
      throw new SnapshotError(`snapshot.protocols[${index}].gecko_id must be a string or null`);
    }
    if (p.symbol !== null && typeof p.symbol !== 'string') {
      throw new SnapshotError(`snapshot.protocols[${index}].symbol must be a string or null`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: p.category as string | null,
      chains: p.chains as string[],
      tvl_usd: p.tvl_usd as number,
      change_7d: p.change_7d as number | null,
      mcap_usd: p.mcap_usd as number | null,
      listed_at: p.listed_at as string | null,
      gecko_id: p.gecko_id as string | null,
      symbol: p.symbol as string | null,
    };
  });
  for (const field of required) {
    if (protocols.some((p) => !(field in p))) {
      throw new SnapshotError(`snapshot.protocols missing field "${field}"`);
    }
  }
  if (!Array.isArray(root.watchlist) || root.watchlist.some((w) => typeof w !== 'string')) {
    throw new SnapshotError('snapshot.watchlist must be an array of strings');
  }
  const watchlist = root.watchlist as string[];
  const slugs = new Set(protocols.map((p) => p.slug));
  const missingWatchlist = watchlist.filter((slug) => !slugs.has(slug));
  if (missingWatchlist.length > 0) {
    throw new SnapshotError(`watchlist slugs not in snapshot: ${missingWatchlist.join(', ')}`);
  }
  return {
    as_of: root.as_of as string,
    source: root.source as string,
    floor_usd: root.floor_usd as number,
    protocols,
    watchlist,
  };
}

/** The capital a farm plan starts with, by the protocol's TVL tier. */
export function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 500_000_000) return 150;
  if (p.tvl_usd >= 200_000_000) return 100;
  return 50;
}

/** How long the plan holds the position, by how old the protocol is. */
export function holdDaysFor(age: number | null): number {
  if (age !== null && age >= 730) return 60;
  if (age !== null && age >= 365) return 45;
  return 30;
}

/** The gas budget the farm steps charge, by chain. */
export function gasFor(p: SnapshotProtocol): number {
  if (p.chains.length > 0 && p.chains.every((c) => c === 'Ethereum')) return 20;
  if (p.chains.length > 0 && p.chains.every((c) => c === 'Solana')) return 1;
  return 5;
}

const ACTION_VERBS: Record<string, string> = {
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
  'Perpetuals': 'open a small hedged perpetual position',
  'Prediction Market': 'take a small position in a market',
  Indexes: 'buy the index token',
  Launchpad: 'join the launch pool with a small amount',
  Gaming: 'play the game with the smallest stake',
  NFT: 'buy the cheapest NFT in the collection',
  'Liquid Staking': 'stake a small amount',
  Bridge: 'bridge a small amount to another chain',
  'Stablecoins': 'hold the stablecoin',
  'Basis Trading': 'open a small basis position',
  'Synthetics': 'mint a small synthetic position',
  'Tokenized T-Bills': 'buy a share of the tokenised T-bill',
  Farming: 'join the farm with a small stake',
  'Money Markets': 'deposit into the money market',
  'Vaults': 'deposit into the vault',
  'Restaking': 'stake the restaked asset',
};

/** The category's own first action, or a plain holding action when the category has none. */
export function actionFor(p: SnapshotProtocol, capital: number): string {
  const verb = p.category !== null ? ACTION_VERBS[p.category] : undefined;
  return verb !== undefined ? verb : `use the protocol's main feature with $${capital} and hold`;
}

/**
 * The recurring action that keeps a farm alive after the first deposit: one
 * concrete thing to do again, by the category the protocol belongs to, on
 * the protocol's second chain when it has one, or on its only chain.
 * A farm that only deposits and waits is a wallet that airdrop hunters
 * screen out; a farm that comes back every week or month is a user.
 */
export function recurringActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = p.category ?? '';
  if (c === 'Lending' || c === 'CDP' || c === 'Money Markets') {
    return `Once a month, repay a small part of the borrow and borrow it again on ${chain} so the position shows fresh activity.`;
  }
  if (c === 'Dexs' || c === 'AMM') {
    return `Swap $${Math.min(10, capital)} through the pool on ${chain} once a week so the position keeps earning fees and shows weekly use.`;
  }
  if (c === 'Yield' || c === 'Yield Aggregator' || c === 'Vaults' || c === 'Risk Curators' || c === 'Onchain Capital Allocator') {
    return `Claim and restake the vault yield on ${chain} once a month instead of letting it sit idle.`;
  }
  if (c === 'Derivatives' || c === 'Perpetuals' || c === 'Synthetics' || c === 'Basis Trading') {
    return `Close and reopen the hedge on ${chain} once a month so the margin account shows fresh trades.`;
  }
  if (c === 'Options') {
    return `Roll the covered position on ${chain} once before it expires so the collateral keeps working.`;
  }
  if (c === 'Prediction Market') {
    return `Take one more small position each month on ${chain} in a market that settles within the week.`;
  }
  if (c === 'Stablecoins' || c === 'RWA' || c === 'Tokenized T-Bills') {
    return `Check the yield payout on ${chain} each month and keep the asset held for the full period.`;
  }
  if (c === 'Insurance') {
    return `Renew the cover on ${chain} before it lapses so the policy never has a gap.`;
  }
  if (c === 'Indexes') {
    return `Rebalance the index holding on ${chain} once a month if the index adds or drops a token.`;
  }
  if (c === 'Launchpad') {
    return `Join one more sale each month on ${chain} while the launch pool is open.`;
  }
  if (c === 'Gaming' || c === 'NFT') {
    return `Use the app on ${chain} once a week so the account shows weekly activity.`;
  }
  if (c === 'Bridge' || c === 'Canonical Bridge') {
    return `Bridge a small amount back to ${chain} once a month so the route shows two-way use.`;
  }
  return `Use the protocol's main feature on ${chain} once a week so the position shows steady activity.`;
}

/** A farm step that fits the dossier's length bounds: 20 to 600 characters. */
function stepText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length >= 20) return trimmed.slice(0, 600);
  return `${trimmed} Keep a record of the transaction hash and the date.`.slice(0, 600);
}

/**
 * The six-step farm plan for one protocol. It is a concrete routine, not a
 * promise: a fresh wallet, one first action with the tier's capital, one
 * recurring action on the second chain when the protocol spans two or one
 * different action on its only chain, a holding period by the protocol's
 * age, a claim check, and a written log that records the model's implied
 * value and the date. Nothing here guarantees an airdrop; the plan is the
 * cheapest way to look like a real user of the protocol.
 */
export function farmSteps(
  p: SnapshotProtocol,
  age: number | null,
  implied: number,
): FarmStep[] {
  const capital = capitalFor(p);
  const gas = gasFor(p);
  const chain = p.chains[0] ?? 'the protocol';
  const secondChain = p.chains.length > 1 ? p.chains[1]! : chain;
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital);
  const steps: FarmStep[] = [
    {
      text: stepText(`Open a fresh wallet for this protocol only, so its activity is separate from other farms. Fund it with $${capital} plus about $${gas} for gas, and write down the address.`),
      cost: `$${capital + gas}`,
      time: '5 min',
    },
    {
      text: stepText(`On ${chain}, ${action}. Do it in one transaction, keep the receipt, and check the position shows in the protocol's own interface before moving on.`),
      cost: `$${capital}`,
      time: '15 min',
    },
    {
      text: stepText(recurringActionFor(p, capital, secondChain)),
      cost: 'about $2 of gas',
      time: '10 min a week',
    },
    {
      text: stepText(`Hold the position for ${hold} days. Do not withdraw early: an early exit looks like a hunter's wallet, and the position is worth more as a record of use than as idle capital.`),
      cost: '$0',
      time: `${hold} days`,
    },
    {
      text: stepText(`Check whether the protocol announces a token or a points programme. If it does, read its own rules before claiming anything, and never pay a third party to claim for you.`),
      cost: '$0',
      time: '10 min',
    },
    {
      text: stepText(`Write down the date, the transaction hashes, and the model's implied value of $${implied.toLocaleString('en-US')} for ${p.name} as of this snapshot, so the farm can be judged later against what actually launched.`),
      cost: '$0',
      time: '5 min',
    },
  ];
  return steps;
}

/** The ranked board and the live set, from one snapshot, under `model`. */
export function buildBoard(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): { board: BoardRow[]; live: LiveRow[]; calibration: Calibration } {
  const calibration = calibrateMultiples(snapshot, model);
  const protocols = bySlug(snapshot.protocols);
  const board: BoardRow[] = [];
  const covered = new Set<string>();
  for (const slug of snapshot.watchlist) {
    const p = protocols.get(slug);
    if (p === undefined) continue;
    if (!isRankable(p)) continue;
    covered.add(slug);
    board.push(scoreRow(p, snapshot.as_of, model, calibration, true));
  }
  for (const p of snapshot.protocols) {
    if (covered.has(p.slug)) continue;
    if (p.tvl_usd >= snapshot.floor_usd) continue;
    if (!isRankable(p)) continue;
    covered.add(p.slug);
    board.push(scoreRow(p, snapshot.as_of, model, calibration, false));
  }
  board.sort((a, b) => b.implied_value_usd - a.implied_value_usd || (a.slug < b.slug ? -1 : 1));
  board.forEach((row, index) => {
    row.rank = index + 1;
  });
  const live = snapshot.protocols
    .filter((p) => !isPreToken(p))
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || (a.slug < b.slug ? -1 : 1))
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
  return { board, live, calibration };
}

function scoreRow(
  p: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  calibration: Calibration,
  onWatchlist: boolean,
): BoardRow {
  const value = impliedValue(p, asOf, model, calibration);
  const steps = farmSteps(p, value.age, value.implied).map((s) => s.text);
  return {
    rank: 0,
    slug: p.slug,
    name: p.name,
    category: p.category,
    chains: p.chains,
    tvl_usd: p.tvl_usd,
    change_7d: p.change_7d,
    mcap_usd: p.mcap_usd,
    listed_at: p.listed_at,
    gecko_id: p.gecko_id,
    symbol: p.symbol,
    token_status: 'pre-token',
    on_watchlist: onWatchlist,
    age_days: value.age,
    implied_value_usd: value.implied,
    model: {
      base_usd: value.base,
      base_multiple: value.categoryMultiple,
      category_multiple: value.categoryMultiple,
      category_comps: value.categoryComps,
      calibrated: value.calibrated,
      growth_pct: value.growthPct,
      growth_multiplier: value.growthMult,
      maturity_multiplier: value.maturityMult,
      breadth_multiplier: value.breadthMult,
      age_days: value.age,
    },
    farm_steps: steps,
  };
}

/** The ranked board and the dashboard's compact view of it, from one snapshot. */
export function buildRadar(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): { board: BoardRow[]; radar: RadarData } {
  const { board, live, calibration } = buildBoard(snapshot, model);
  const rows: RadarRow[] = board.map((row) => ({
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    on_watchlist: row.on_watchlist,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    category_comps: row.model.category_comps,
    calibrated: row.model.calibrated,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
  }));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    calibration,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: board.filter((r) => !r.on_watchlist).length,
    live_size: live.length,
    rows,
    live,
  };
  return { board, radar };
}

/** A board is a board: full watchlist coverage, 100 to 4,000 rows, ranks 1..n, sorted by implied value, usable farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((row) => row.slug));
  for (const slug of snapshot.watchlist) {
    const p = snapshot.protocols.find((q) => q.slug === slug);
    if (p !== undefined && isRankable(p) && !slugs.has(slug)) {
      return `watchlist slug ${slug} is missing from the board`;
    }
  }
  if (board.length < 100 || board.length > 4000) {
    return `board size ${board.length} is outside the 100..4000 range`;
  }
  for (let i = 0; i < board.length; i += 1) {
    const row = board[i]!;
    if (row.rank !== i + 1) return `row ${row.slug} has rank ${row.rank}, expected ${i + 1}`;
    if (i > 0 && board[i - 1]!.implied_value_usd < row.implied_value_usd) {
      return `board is not sorted at rank ${row.rank}`;
    }
    if (!Number.isInteger(row.implied_value_usd) || row.implied_value_usd <= 0) {
      return `row ${row.slug} has a non-positive or non-integer implied value`;
    }
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) {
      return `row ${row.slug} has ${row.farm_steps.length} farm steps, expected 3..12`;
    }
    for (const step of row.farm_steps) {
      if (step.length < 20 || step.length > 600) {
        return `row ${row.slug} has a farm step of ${step.length} characters, expected 20..600`;
      }
    }
  }
  return null;
}

/** The dashboard's data as a script tag's body: `window.RADAR = {...}`. */
export function dataScript(data: RadarData): string {
  return `window.RADAR = ${JSON.stringify(data)};\n`;
}
