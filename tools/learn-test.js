// node tools/learn-test.js — checks the v22 learning system behaves sensibly
const Learn = require('../public/learn.js');
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('✕ ' + msg); } };

// 1. a fresh brain changes nothing
let L = Learn.fresh();
const asiaSell = ['bias_with', 'h4_against', 'sess:asia', 'dir:sell'];
const goodBuy = ['bias_with', 'h4_agree', 'd_agree', 'room_big', 'sess:ny_am', 'dir:buy'];
ok(Learn.adjust(L, asiaSell).extra === 0, 'fresh: no adjustment');

// 2. one real loss = small nudge only (no overreaction)
Learn.record(L, asiaSell, false, 'real', 1);
ok(Learn.adjust(L, asiaSell).extra <= 1, 'one loss: at most +1');
ok(!Learn.adjust(L, asiaSell).block, 'one loss: never blocks');

// 3. three real losses in a row = big nudge
Learn.record(L, asiaSell, false, 'real', 2); Learn.record(L, asiaSell, false, 'real', 3);
const a3 = Learn.adjust(L, asiaSell);
ok(a3.extra >= 2, `3 losses: big nudge (got +${a3.extra})`);
ok(!a3.block, '3 real losses alone do not block (needs practice-trade proof)');

// 4. practice trades confirming it's bad → block
for (let i = 0; i < 9; i++) Learn.record(L, asiaSell, i === 0, 'shadow', 10 + i);
ok(Learn.adjust(L, asiaSell).block, 'confirmed by practice trades: blocked');

// 5. winners make it a bit more confident, but never by more than 1
const G = Learn.fresh();
for (let i = 0; i < 6; i++) Learn.record(G, goodBuy, true, 'real', i);
const ag = Learn.adjust(G, goodBuy);
ok(ag.extra === -1, `winners: bar lowered by exactly 1 (got ${ag.extra})`);

// 6. recency: old losses fade after newer wins
const R = Learn.fresh();
for (let i = 0; i < 4; i++) Learn.record(R, ['room_tight'], false, 'real', i);
const before = Learn.edge(R.tags.room_tight);
for (let i = 0; i < 6; i++) Learn.record(R, ['room_tight'], true, 'real', 10 + i);
ok(Learn.edge(R.tags.room_tight) > 0 && before < 0, 'recent wins outweigh older losses');

// 7. practice trade resolves on candles (stop assumed when both touched)
const S = Learn.fresh();
Learn.addShadow(S, { day: '2026-11-20', at: 0, dir: 1, tags: ['x'], entry: 100, sl: 98, tp: 104 });
ok(!Learn.addShadow(S, { day: '2026-11-20', at: 60e3, dir: 1, tags: ['x'], entry: 100, sl: 98, tp: 104 }), 'one practice trade per direction per hour');
Learn.resolveShadows(S, [{ t: 300e3, bh: 101, bl: 99, ah: 101, al: 99 }, { t: 600e3, bh: 104.5, bl: 100, ah: 104.6, al: 100 }], 900e3, () => 1e12);
ok(S.shadows.length === 0 && S.tags.x.sw === 1, 'practice win recorded');

// 8. loss reviews
const rv = Learn.review({ entry: 100, sl: 98, tp: 104, dir: 1, best: 102.5, reason: 'stop', tags: ['h4_against', 'sess:asia'] });
ok(rv.reasons.some((r) => /bigger trend/.test(r)) && rv.reasons.some((r) => /working, then reversed/.test(r)) && rv.pending, 'loss review finds reasons');
ok(Learn.lateCheck({ dir: 1, tp: 104, closedAt: 0 }, [{ t: 3600e3, bh: 104.2, al: 103 }]), 'stop-too-tight check');

// 9. tags from the real score factors
const tags = Learn.tagsFrom([{ pts: 2, html: '1H bias is bullish — with you' }, { pts: 1, html: '4H trend agrees' }, { pts: -1, html: 'Daily trend is bearish' }, { pts: 1, html: '12.00 of room to PDH (4100.00)' }], 1, 9 * 60);
ok(['bias_with', 'h4_agree', 'd_against', 'room_big', 'sess:ny_am', 'dir:buy'].every((t) => tags.includes(t)), 'tags: ' + tags.join(','));

console.log(`${pass}/${pass + fail} learning checks passed`);
if (fail) process.exitCode = 1;
