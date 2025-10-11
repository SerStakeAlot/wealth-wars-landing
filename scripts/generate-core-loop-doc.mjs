import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, Header, Footer } from 'docx'
import fs from 'fs'
import path from 'path'

// Color accents used for headings/text emphasis (dark text on white background)
const gold = 'C9A227'
const accent = 'C27D1A'
const muted = '666666'
const body = '222222'

function title(text) {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [ new TextRun({ text, bold: true, color: gold, size: 56 }) ],
  })
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 120 },
    children: [ new TextRun({ text, bold: true, color: gold, size: 36 }) ],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 160, after: 80 },
    children: [ new TextRun({ text, bold: true, color: accent, size: 28 }) ],
  })
}

function p(text, options = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: options.center ? AlignmentType.CENTER : undefined,
    children: [ new TextRun({ text, color: options.color || body, size: options.size || 22 }) ],
  })
}

function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 60 } })
}

function numbered(text, level = 0) {
  return new Paragraph({ text, numbering: { reference: 'numbered', level }, spacing: { after: 80 } })
}

function smallNote(text) {
  return new Paragraph({ spacing: { after: 60 }, children: [ new TextRun({ text, color: muted, size: 18, italics: true }) ] })
}

function makeTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
    },
    rows: rows.map(r => new TableRow({ children: r.map(cell => new TableCell({ children: [ p(cell) ] })) }))
  })
}

function asciiBlock(lines) {
  // Render preformatted ASCII using a monospaced font to preserve layout
  return lines.map(line => new Paragraph({
    spacing: { after: 0 },
    children: [ new TextRun({ text: line, font: 'Courier New', size: 20, color: body }) ],
  }))
}

async function run() {
  const outDir = path.resolve('docs')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'numbered',
          levels: [
            { level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT },
            { level: 1, format: 'decimal', text: '%2.', alignment: AlignmentType.LEFT },
          ],
        },
      ],
    },
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      headers: { default: new Header({ children: [ new Paragraph({ alignment: AlignmentType.LEFT, children: [ new TextRun({ text: 'WEALTH WARS', color: gold, bold: true, size: 22 }) ] }) ] }) },
      footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: 'Wealth Wars — Confidential Draft', color: muted, size: 18 }) ] }) ] }) },
      children: [
        title('Wealth Wars — Core Game Loop (Draft Overview)'),
        p('Draft — October 9, 2025', { center: true, color: muted }),

  h1('Mission Statement'),
  p('Wealth Wars is a free-to-play strategy clicker where anyone can jump in and try to earn real value by simply playing—no purchase required. The purpose is simple: create a fair, fun economy where showing up and playing smart can translate into a shot at real rewards.'),
  p('You don’t need to pay to compete. Clock in, stack Credits, and time your moves to convert into a share of the daily $WEALTH pool. Skill, consistency, and strategy—not spending—drive your progress.'),
  smallNote('Nothing in this document is financial advice. Payouts and pacing are governed by published rules, pools, and safeguards. Earnings are not guaranteed and depend on activity, participation, and design tuning.'),

        p('This document describes how a player progresses through Wealth Wars, from “Clock-In” to building, converting, defending, attacking, and advancing the economy. It includes two main pathways:'),

        h2('Two Main Pathways'),
        bullet('Path A: Starting with no $WEALTH (earn Credits → decide to build or convert)'),
        bullet('Path B: Entering with $WEALTH (premium/upgraded options unlocked)'),
        smallNote('All figures shown are the current reference values to match Tokenomics and Demo; they are tunable for balance.'),

        h1('Key References (current)'),
        bullet('Soft reference ratio: 100 Credits = 1 $WEALTH'),
        bullet('Global Exchange Pool (Daily): 1,000,000 $WEALTH shared across active players'),
        bullet('Effective per-player limit: min(100,000, Pool / Active Players). Example: 100 actives → 10,000.'),
        bullet('Clock-In reward: 1,000 Credits per successful check-in (30-minute cooldown)'),
        bullet('Shares: Up to 5 verified social shares/day → each gives +1 click and +1,000 Credits, and refreshes cooldown'),
        bullet('Per-player conversion window (initial design): up to 100,000 $WEALTH/day (subject to safeguards and pacing)'),
        bullet('Economic sinks: business upgrades (enhanced), shields, lottery, battles/clan (phased rollout)'),
        bullet('Special events: Treasury Unlock (Oct 30); Developer Vault rewards (includes demo players)'),

        h1('1) The Core Loop (high level)'),
        numbered('Player clicks "Clock-In"'),
        bullet('Gains 1,000 Credits'),
        bullet('Starts/refreshes a 30-minute cooldown'),
        bullet('Optional: Share for bonus clicks (max 5/day), each +1,000 Credits and resets cooldown'),
        p('Player decides how to use Credits (fork):'),
        bullet('A) Buy Businesses (increase Credit production velocity)'),
        bullet('B) Convert Credits → $WEALTH (subject to daily pacing, global pool, and caps)'),
        p('With $WEALTH, player chooses among sinks (another fork):'),
        bullet('A) Upgrade Businesses (enhanced tiers that require $WEALTH)'),
        bullet('B) Buy Shields (defense)'),
        bullet('C) Enter Lottery (risk/reward)'),
        bullet('D) Fund Battles/Clan/Offense (phased feature)'),
        bullet('E) Hold $WEALTH (strategic timing, future governance or events)'),
        smallNote('Repeat loop with better output, better timing, and higher strategic pressure.'),

        h1('2) Flow With Forks (textual diagram)'),
        p('Start ->'),
        p('Clock-In (every 30 minutes) - +1,000 Credits - Shares (max 5/day) -> +1 click, +1,000 Credits, refresh cooldown ->'),
        p('Manage Credits'),
        p('Path A: Buy Businesses (Credits)'),
        p('  - Increases Credits/minute or Credits/click'),
        p('  - Unlocks tiers; later tiers cost more but scale output'),
        p('  - Sets you up for compounding production'),
        p('Path B: Convert Credits -> $WEALTH'),
        p('  - Soft ratio: 100 Credits = 1 $WEALTH'),
        p('  - Global daily pool: 1,000,000 $WEALTH shared across actives'),
        p('  - Effective per-player: min(100,000, Pool / Active Players) — timing matters'),
        p('  - Conversion timing becomes a strategic decision'),
        p('After Conversion (player holds $WEALTH)'),
        p('  - Enhanced Businesses (WEALTH Upgrades): spend to unlock multipliers'),
        p('  - Shields (Defense): purchase tiers to protect against raids/attacks'),
        p('  - Lottery (Risk/Reward): enter with $WEALTH (e.g., 25 $WEALTH entry); sinks supply'),
        p('  - Battles / Clan / Raids (Offense — phased): spend to initiate actions; outcomes balanced by defense'),
        p('  - Hold / Save for Events or Market Timing: anticipate unlocks, quests, seasonal events'),
        smallNote('Loop back to Clock-In and continue optimizing.'),

        h2('Flow With Forks — ASCII View (portable)'),
        ...asciiBlock([
          '+------------------+',
          '|      START       |',
          '+------------------+',
          '         |',
          '         v',
          '+------------------+',
          '|    CLOCK-IN      |  (+1,000 Credits)',
          '+------------------+',
          '         |',
          '         +---- Share up to 5/day: +1 click & +1,000 Credits; refresh cooldown',
          '         |',
          '         v',
          '+------------------+',
          '|  MANAGE CREDITS  |',
          '+------------------+',
          '     /                      \\',
          '    v                        v',
          '+------------------+   +-------------------------------+',
          '|  BUY BUSINESSES  |   | CONVERT CREDITS -> $WEALTH    |',
          '+------------------+   +-------------------------------+',
          '    |                          |',
          '    |  Improves Credits/min    |  100 Credits = 1 $WEALTH',
          '    |  and per-click output    |  Global Pool: 1,000,000/day',
          '    |  (compounding)           |  Effective cap = min(100,000, Pool/Actives)',
          '    |                          |  Timing matters',
          '    v                          v',
          '                 +---------------------------+',
          '                 |   AFTER CONVERSION ($W)   |',
          '                 +---------------------------+',
          '                 |   Upgrades  |  Shields    |',
          '                 |   Lottery   |  Battles    |',
          '                 |   Hold for Events/Timing  |',
          '                 +---------------------------+',
        ]),

        h1('3) Alternate Entry: Player Begins With $WEALTH'),
        p('Some players arrive already holding $WEALTH (e.g., from airdrops, markets, or prior events). They skip the initial ramp and immediately choose among $WEALTH sinks:'),
        h2('Enhanced Businesses'),
        bullet('Directly buy premium upgrades to accelerate Credit production immediately.'),
        bullet('Creates a "capital-first" progression path (fast-track output).'),
        h2('Shields'),
        bullet('Purchase protection immediately to reduce vulnerability during early growth.'),
        h2('Lottery'),
        bullet('Attempt to turn $WEALTH into more $WEALTH at risk; high variance.'),
        h2('Battles / Clan / Raids (phased)'),
        bullet('Fund offensive actions and team play; convert $WEALTH into competitive pressure.'),
        h2('Hold for Timing'),
        bullet('Wait for specific events (e.g., Treasury Unlock cadence) or for optimal conversion opportunities (when balancing changes).'),
        smallNote('Note: In the current design, conversion is Credits → $WEALTH (not the reverse). Players with $WEALTH don’t convert back to Credits; instead, they spend $WEALTH to buy or enhance systems that indirectly boost their Credit generation.'),

        h1('4) Detailed Mechanics'),
        h2('A. Clock-In System'),
        bullet('Reward: +1,000 Credits per successful check-in.'),
        bullet('Cooldown: 30 minutes between clock-ins.'),
        bullet('Shares: Up to 5 verified shares/day (X, Telegram, etc.) -> each grants +1 click (+1,000 Credits) and refreshes the cooldown.'),
        bullet('Intent: Reward consistency and community visibility while limiting spam.'),
        h2('B. Businesses (Credits)'),
        bullet('Purchase with Credits; each tier increases production rate and/or reduces friction.'),
        bullet('Cost scales up per tier; ROI depends on timing and competition.'),
        bullet('Goal: Create compounding Credit production so your conversion choices become more powerful.'),
        h2('C. Conversion (Credits → $WEALTH)'),
        bullet('Reference ratio: 100 Credits = 1 $WEALTH (soft, tunable).'),
        bullet('Global Pool: 1,000,000 $WEALTH daily shared across active players.'),
        bullet('Effective per-player: min(100,000, Pool / Active Players). Example: 100 actives -> 10,000.'),
        bullet('Pacing: Daily safeguards and per-player window (initially up to 100,000 $WEALTH/day).'),
        bullet('Strategy: Converting too early vs too late; holding Credits longer vs upgrading Businesses first.'),
        h2('D. $WEALTH Sinks & Utilities'),
        h2('— Enhanced Businesses (WEALTH Upgrades)'),
        bullet('Spend $WEALTH to unlock advanced tiers or efficiency multipliers.'),
        bullet('These are designed to be strong but not runaway; tuned to keep a long-lived economy.'),
        h2('— Shields (Defense)'),
        bullet('Spend $WEALTH to reduce/negate damage or loss during attack windows.'),
        bullet('Timing matters—well-timed shields preserve gains and shift attacker decision-making.'),
        h2('— Lottery (Risk/Reward)'),
        bullet('Spend $WEALTH for a chance to win a large payout; a planned stabilization sink.'),
        bullet('Prize structure e.g., 80% to winner (design-dependent), small portions to Treasury/redistribution.'),
        h2('— Battles / Clan / Raids (Phased)'),
        bullet('Attack costs, cooldowns, and outcomes balanced against shield strength and economic risk.'),
        bullet('Team/clan coordination introduces macro goals and territory/land later.'),
        h2('— Holding $WEALTH'),
        bullet('Keep dry powder for events, buybacks, quests, or to react to economic shifts.'),
        h2('E. Events & Carryover'),
        bullet('Treasury Unlock (Oct 30): Structured release to community holders and core pools (see Tokenomics).'),
        bullet('Developer Vault: Funds demo rewards, liquidity stabilization, quests, development.'),
        bullet('Carryover to Main Game (Founding Credits): Demo Credits convert to Founding Credits (1–2% reserved pool), giving early players a head start and prestige ("Founding Citizen — Season Zero").'),

        h1('5) Example Day (New Player)'),
        bullet('08:00: Player clocks in -> +1,000 Credits (cooldown starts).'),
        bullet('08:05: Shares a post -> +1 click -> +1,000 Credits (cooldown refresh) [up to 5/day].'),
        bullet('08:35: Clock-in again -> +1,000 Credits.'),
        bullet('09:05: Clock-in again -> +1,000 Credits.'),
        p('With Credits accumulated:'),
        bullet('Option 1: Buy Businesses (increase Credits output).'),
        bullet('Option 2: Convert portion of Credits -> $WEALTH (e.g., 50,000 Credits = 500 $WEALTH).'),
        p('$WEALTH options:'),
        bullet('Buy a Shield for defense, upgrade a Business (enhanced), or enter the Lottery.'),
        smallNote('Over the day, repeating the cycle compounds output and gives more $WEALTH options.'),

        h1('6) Example Day (Player Starts With $WEALTH)'),
        bullet('Immediately buys Enhanced Businesses with $WEALTH to accelerate Credit production.'),
        bullet('Buys a Shield to prevent early setbacks.'),
        bullet('Enters a Lottery round with a small amount for variance.'),
        bullet('Begins Clock-In cadence to stack Credits while the enhanced engine ramps faster than a new player’s baseline.'),

  h1('7) Design Notes & Safeguards'),
        bullet('Tunable Parameters: The ratio, caps, shield strength, and lottery returns will be adjusted during stabilization.'),
        bullet('Anti-Bot Gating: Cooldowns, rate-limiters, and verification around shares/check-ins.'),
        bullet('Economy Integrity: Sinks (upgrades, lottery, defense/offense) recycle value and prevent runaway emissions.'),
        bullet('Transparent Targets: Emission targets and unlock events are published; governance/advanced features arrive when the core loop is healthy.'),

        h1('8) Glossary'),
        bullet('Credits: Soft currency earned via Clock-In and gameplay; used to buy Businesses and convert to $WEALTH.'),
        bullet('$WEALTH: Hard currency with sinks and strategic usage; earned by converting Credits; limited by pacing, global pool, and caps.'),
        bullet('Businesses: Production structures that increase your Credit output.'),
        bullet('Enhanced Businesses: Premium upgrades for Businesses purchasable with $WEALTH.'),
        bullet('Shields: Defensive purchases that reduce or negate losses from attacks.'),
        bullet('Lottery: High variance system where $WEALTH is risked for a chance at large rewards.'),
        bullet('Battles/Clan/Raids: Competitive play spending $WEALTH to attack and coordinate; phased deployment.'),
        bullet('Founding Credits: Special recognition of demo activity carrying forward a head start into the main game.'),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const outPath = path.join(outDir, 'Core-Game-Loop—Wealth-Wars.docx')
  fs.writeFileSync(outPath, buffer)
  console.log('Wrote', outPath)
}

run().catch(err => { console.error(err); process.exit(1) })
