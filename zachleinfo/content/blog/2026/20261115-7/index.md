---
title: "Building a Game Community Platform with AI Agents, Part 7: A Provably Fair Play-Money Economy"
date: 2026-11-15T14:06:00-08:00
tags: ["ai", "claude-code", "python", "discord", "sqlite", "cryptography"]
categories: ["blog"]
series: ["building a game community platform with ai agents"]
series_order: 7
summary: "pyaaa, the Discord bot that runs the community server, also runs a play-money economy: about a dozen games, trading cards, sports betting, a pretend stock market, and quarterly seasons. This part covers what members actually do with it, how every game is made provably fair, how an append-only ledger keeps the books honest, and how staff run all of it from a web dashboard."
description: "Part 7 of a series on building a self-hosted Aion 2 community platform with AI coding agents: a provably fair play-money economy in a discord.py bot, with commit-reveal seeds, HMAC-SHA256, an append-only ledger, hourly reconciliation, seasons, and a staff dashboard."
keywords: "provably fair, commit-reveal, hmac-sha256, rejection sampling, discord.py, sqlite, ledger, reconciliation, ai agents, claude code"
url: "/blog/2026/ai-agent-platform-part-7"
---

## The bot that runs the server also runs a casino

Most of this series has been about Nyerkulator, the desktop app, and the infrastructure behind it. This part is about the other big piece from [Part 1](/blog/2026/ai-agent-platform-part-1): **pyaaa**, the Discord bot that runs the community server itself.

On paper, pyaaa is a server management bot. It handles roles, verification, channel access, raids, tickets, and boss timers, and those get their own posts later in the series. In practice, a huge share of what people actually *do* with it is play with fake money. It runs a coin economy called pyacoins with about a dozen games, a trading card game, sports betting on staff-made events, a pretend stock market, and quarterly seasons, because once you have a currency, apparently a stock market is just what happens next.

All told, it's **123 slash commands in 8 categories**, generated straight from the bot's own command registry:

![Overview of pyaaa's 123 slash commands grouped into eight categories: pyacoin economy, games, pretend market, trading cards, raids and scheduling, boss timers, community, and staff and moderation](commands-overview.webp)

Before going any further, since this post is going to talk a lot about bets, payouts, and odds: **pyacoins are play money.** They can't be bought, sold, or cashed out, and they have no value anywhere outside our Discord server. You get them from daily check-ins, events, and the games themselves. The bot says so on nearly every economy message, and the staff dashboard repeats it at the top of every economy page. It's not small print on a terms page.

Every Discord screenshot in this post comes from the bot's real code run offline against a throwaway database, with fake demo members like Aria, Kael, Mira, and Torin. The dashboard shots come from a local copy with the same demo data. Nobody from the actual server is in here.

As with everything else in this series, the agents wrote the code. My job was deciding what the economy should do and what "fair" had to mean, reviewing what came back, and approving it.

## A day in the economy

The front door is `/pyacoin help`, which explains how pyacoins work and says, again, that there's no real money involved. From there, most people's day starts with `/daily`: a check-in that pays a few coins, tracks your streak, moves you along a monthly ladder of rewards (the demo shows a card pack voucher at five check-ins), and adds to a shared daily pool.

The games live behind `/game`, which opens a private menu of whichever games are switched on, with a bet picker. The solo games are quick:

- **Coin flip** is the even-money basic. Win one, and pyaaa offers to **upgrade the win**: stake part of it on a bigger multiple. The offer spells out the stake, the multiple, the exact chance of success, and what you walk away with either way *before* you confirm, then plays out a little bowling animation.
- **Scratch cards** have you pick one of three face-down cards, with three alike winning, and then show what the other two cards held.
- **Plinko** drops three balls through the pegs and shows each slot's multiplier and the payout.
- **Gear crafting** is themed on the game's own crafting: a success bar against a failure bar, and a loss offers "Run it back."
- **The daily word game** is a five-letter guessing game with a picture board and a shareable result. It pays coins for solving it rather than taking a bet.

{{< carousel images="{d-help.webp,d-daily.webp,d-menu.webp,d-upgrade.webp,d-scratch.webp,d-scratch-revealed.webp,d-plinko.webp,d-crafting.webp,d-word.webp}" captions="{d-help.webp:pyacoin help explains the economy and says up front that there is no real money,d-daily.webp:Daily check-in with a streak and a monthly ladder and the shared daily pool,d-menu.webp:The private game menu shows only the games that are switched on,d-upgrade.webp:A coin flip win and the upgrade offer with its odds shown before you confirm,d-scratch.webp:Scratch card with three face-down cards to pick from,d-scratch-revealed.webp:The revealed scratch card shows the winning row and the other two cards,d-plinko.webp:Plinko drops three balls and shows each slot multiplier,d-crafting.webp:Gear crafting with its success and failure bars,d-word.webp:The daily word game with its picture board and shareable result}" aspectRatio="4-3" interval="6000" >}}

Then there are the shared tables, which are where the server actually gathers. **Roulette** runs on a clock: a table opens, everyone places bets by button or slash command, and the wheel spins when the countdown ends, with per-player results and an Upgrade button for each winner. `/roulette history` shows the last spins, hot and cold numbers, and the green pot. **Blackjack** is multiplayer, with seats, a turn marker, and move buttons, and a settled round shows the dealer's hand and every seat's result and net.

{{< carousel images="{d-roulette-table.webp,d-roulette-result.webp,d-roulette-history.webp,d-blackjack-dealt.webp,d-blackjack-settled.webp}" captions="{d-roulette-table.webp:The shared roulette table runs on a countdown,d-roulette-result.webp:Spin result with every player and an Upgrade button for each winner,d-roulette-history.webp:Roulette history with hot and cold numbers and the green pot,d-blackjack-dealt.webp:Multiplayer blackjack with seats and a turn marker,d-blackjack-settled.webp:A settled blackjack round with each seat result and net}" aspectRatio="4-3" interval="6000" >}}

So if it's all fake money, why does any of this need serious engineering? Because the moment a bot is the house, people are going to wonder whether the house is cheating. That's a completely reasonable thing to wonder about a bot whose code you can't see, run by the same person who runs the server. "Trust me" is not an answer I wanted to give, so I asked for something better: every coin game had to be **provably fair**, with no blockchain and no outside randomness service. Players should be able to check any result themselves, after the fact, without trusting me or the bot.

## How provably fair actually works

The approach is called commit-reveal, and it's simpler than it sounds. The whole trick is that the bot locks in its randomness *before* anyone bets, and proves later that it didn't change it.

Here's the shape of it in pyaaa:

- **One server seed per game day.** At the start of the day, the bot picks a secret random seed and immediately publishes its SHA-256 hash. The hash is the commitment. It doesn't reveal the seed, but it pins it down: there's no practical way to find a different seed with the same hash.
- **The seed is revealed after the day ends.** Once nobody can bet against it anymore, the actual seed goes public, and anyone can hash it and check that it matches what was published that morning.
- **Results come from HMAC-SHA256** over the client seed, the game, a round key, and a nonce, keyed by the day's server seed. Same inputs, same output, every time, so once the seed is out, every round from that day can be recomputed from scratch. Members can set their own client seed with `/fair seed`.
- **Rejection sampling removes modulo bias.** This one is easy to get wrong. If you take a random number and just do `% 37` to pick a roulette pocket, some pockets come up very slightly more often than others, because the random range doesn't divide evenly by 37. Rejection sampling throws away the values from the uneven tail and draws again, so every outcome is exactly as likely as it should be.
- **Blackjack gets special handling.** A shoe gets shuffled once with that day's seed and then dealt over many hands, possibly past midnight. If the seed were revealed while that shoe was still in play, anyone could work out every card left in it. So a day stays sealed until the last shoe shuffled with its seed has finished being dealt.

Then there's the part players actually touch. Every result carries a round id. `/pyacoin wagers` lists every past bet across the games, with filters and those ids, and **`/fair verify`** replays the real game code on a round's inputs and tells you whether the stored result matches. Because "the bot says the bot is fair" is a bit circular, there's also a short Python script, standard library only, that anyone can run on their own machine to check results without involving pyaaa at all.

Publishing the odds runs through everything else, too. `/odds` puts every game's chances and payouts in one place, and `/game rules` explains how each game is played and what it pays. Trading card packs show their real pull odds slot by slot instead of hiding behind a "rare chance!" label. And the weekly lottery, where you can buy tickets with your own numbers, posts its draw with the winning numbers, the winners in each prize tier, the rollover, and the `/fair verify` command for that draw, with `/lottery history` keeping past draws and hot and cold numbers.

{{< carousel images="{d-wagers.webp,d-cards-odds.webp,d-lottery-buy.webp,d-lottery-draw.webp,d-lottery-history.webp}" captions="{d-wagers.webp:Every past bet with its fairness round id to check with fair verify,d-cards-odds.webp:Trading card pull odds published slot by slot,d-lottery-buy.webp:The lottery ticket panel and a ticket bought with your own numbers,d-lottery-draw.webp:The weekly draw with prize tiers and a fair verify command,d-lottery-history.webp:Lottery history with past draws and hot and cold numbers}" aspectRatio="4-3" interval="6000" >}}

### What the review caught, and what it didn't

The fairness change went through an independent review before it merged, which is the written rule for changes in this project ([Part 2](/blog/2026/ai-agent-platform-part-2) goes into the review and merge process). The big question for that review was whether a seed could leak before its reveal, since that's the one failure that breaks the whole scheme, and it found no way for that to happen.

It did find a real bug, and it's a good example of why the verify path deserves as much care as the game path. If a roulette spin's stored result had been changed, `/fair verify` reported it as "nothing stored" instead of "does not match." Those mean very different things. One says "I can't find this round," the other says "this round was tampered with," and a fairness checker that mumbles the second as the first isn't doing its job. That got fixed before merge.

The other thing I cared about: none of this was allowed to change the actual games. Odds and payouts had to come out exactly the same as before, checked with the house-edge tests and Monte Carlo runs rather than eyeballed. Swapping out a random number generator is a great way to accidentally make roulette pay a little better or a little worse, and nobody would notice for weeks.

## Cards, sports and a pretend stock market

Beyond the casino games, three bigger systems hang off the same currency.

**Trading cards** come in packs you open with pyacoins. The hit card shows up with its art and a serial number, and cards can be collected, traded, and sold back. **Sports betting** runs on events staff create, with odds attached, and the book refuses odds that would favor the bank. Members bet with `/sports bet`, and when staff settle an event, winning bets are paid out automatically.

And then there's the **pretend stock market**, which I'd be lying if I said wasn't the most fun thing in the bot. It has made-up companies and an index fund, simulated company news and results that move prices, options for the brave, price charts with range buttons, and an embed guide with a topic picker for anyone who wants to learn how it works. Every chart says right on it that these are made-up prices and not real trading.

{{< carousel images="{d-cards-open.webp,d-sports-create.webp,d-sports-settle.webp,d-market-list.webp,d-market-chart.webp,d-market-news.webp,d-market-help.webp}" captions="{d-cards-open.webp:Opening a card pack with the hit card shown with its art and serial,d-sports-create.webp:Staff create a sports event and the book refuses odds that favor the bank,d-sports-settle.webp:Open events and a bet placed and then the staff settle paying the winners,d-market-list.webp:Made-up companies and an index fund with the day's moves,d-market-chart.webp:A price chart with range buttons,d-market-news.webp:Simulated company news and results that move prices,d-market-help.webp:The market guide with a topic picker}" aspectRatio="4-3" interval="6000" >}}

## Your money, your standing and the season

All of this adds up to a balance, and pyaaa is surprisingly thorough about showing you what yours is made of. `/pyacoin balance` breaks your total value into wallet, vault, stocks, options, and unclaimed rakeback. The **vault** is where you park coins you don't want to gamble, and it pays daily interest on the lowest amount it held that day. Every settled bet counts toward a **wager level** for the season, and **rakeback** gives back a small share of what you lose (3% in the demo, with a weekly cap), which you claim with a button. `/pyacoin graph` charts your total value over the season.

There's also a house view anyone can pull up, showing how players are doing against the bank by game for today, the week, and the season. Coins can enter the economy outside the games too, but only in visible ways: staff with an event grant role can hand out event coins from the bank, and every grant is logged, while members can run **pyacoin giveaways** of their own coins that other verified members join with a button.

{{< carousel images="{d-balance-vault.webp,d-rakeback.webp,d-graph.webp,d-house.webp,d-grant.webp,d-giveaway.webp}" captions="{d-balance-vault.webp:Balance broken into wallet and vault and the vault's daily interest,d-rakeback.webp:Wager level progress and the rakeback claim button,d-graph.webp:Total value over the season,d-house.webp:Players against the house by game for today and the week and the season,d-grant.webp:A staff event grant from the bank that is logged,d-giveaway.webp:A member's pyacoin giveaway and the list of open giveaways}" aspectRatio="4-3" interval="6000" >}}

Everything resets on a schedule. **Seasons** are calendar quarters. `/pyacoin season` shows the time left and the live top ten by total value, and the message spells out exactly what happens at the end: the market is sold, vaults are emptied into wallets, the top three are kept in `/pyacoin history`, every balance goes back to the starting amount, and trading cards are kept. `/pyacoin top` has leaderboards by total value and by most wagered, and `/pyacoin wrapped` gives you your season in numbers: rounds played, favorite game, biggest win, longest streak, and how many of your bets were placed between midnight and 5 AM.

{{< carousel images="{d-season.webp,d-top.webp,d-wagered.webp,d-season-history.webp,d-wrapped.webp}" captions="{d-season.webp:Season standings and exactly what happens when the season ends,d-top.webp:The leaderboard by total value,d-wagered.webp:The leaderboard by most wagered this season,d-season-history.webp:Past season podiums and your placings,d-wrapped.webp:Your season in numbers}" aspectRatio="4-3" interval="6000" >}}

## Keeping the books honest

Fair games are one half of it. The other half is making sure the coins themselves add up, because a currency that can silently appear or disappear isn't much of a currency, play money or not.

Every single coin change in pyaaa goes through an **append-only ledger**: wins, losses, check-ins, grants, giveaways, refunds, rakeback, market trades. Nothing edits a balance directly and nothing deletes ledger rows. A balance is just what the ledger says it should be. On top of that, there are two layers of checking:

- **Database triggers** in SQLite refuse any change that would leave a negative balance, and any row that disagrees with the balance it's supposed to produce. This is the "it physically can't happen" layer, sitting below the application code, so even a buggy feature can't write books that don't balance.
- **An hourly books check**, `econ_reconcile`, compares balances, holds (coins tied up in open bets), and transfers against the ledger and flags anything that doesn't line up. This is the "if something slipped through, I'll hear about it within the hour" layer.

Having those checks is nice. Having them find real problems is where they earn their keep, and they found two.

### The test that only failed for an hour a day

The first one wasn't even a money bug, it was a clock bug, and it's my favorite kind of bug because it was so deeply weird.

The books check looks for "stuck" rounds, like a table round that's been open far longer than it should be. To decide what counts as stuck, it compared against a cutoff, and that cutoff came from SQLite's built-in `now` instead of the project's own clock. The result: tests failed, but **only between 12:05 and 13:00 UTC**. During that window, the test's fixture data for yesterday's round, viewed against the real wall-clock time, suddenly looked old enough to count as stuck. Outside that window, it didn't.

Tests that fail for one hour a day are miserable, because you rerun them, they pass, and you start doubting your own eyes. The fix was making the cutoffs use the project's injectable clock, normalized to UTC, so there's exactly one idea of "now" in the whole system, and running the tests on a fixed clock so they can't drift with real time. Anything time-dependent that reads the real clock directly instead of a clock you control will eventually bite you in a test, usually at a time of day you're not looking.

### The lottery prizes nobody got paid

The second one was a real money bug, and the books check is the reason it can't come back.

The weekly lottery has a pot for matching every number, plus fixed prizes for matching 2, 3, or 4. Before pyaaa PR #117, the weekly draw only ever paid out pot wins. The fixed prizes for partial matches were never paid at all.

Fixing the draw going forward was the easy part. Paying back everyone who'd been shorted needed more care, because "run a script that pays people" is exactly how you accidentally pay people twice. So:

- **An owner-only audit page** works out, from each ticket's own draw, what that ticket should have won. Not from memory or a spreadsheet, from the actual ticket and the actual draw it was in.
- **Dry run first.** The page shows every shortfall it would pay and the total, without touching anything. I look at it.
- **Then Apply.** Each shortfall gets paid exactly once, written to the ledger with the reason `lottery_backpay` and an idempotent reference per ticket. If Apply gets clicked twice, the second attempt sees the reference already exists and does nothing.
- **The books check now looks for it too.** Any winning ticket without a matching payout gets flagged.

"Dry run, then apply, idempotent by design" is the same pattern I'd use for any bulk change on a real system. A backpay that might double-pay is a quick fix that creates its own cleanup job.

## Running it from the dashboard

None of this gets configured by editing files. pyaaa has a web dashboard, signed in with Discord and limited to allowlisted accounts, and the **Games & pyacoins** hub is a tile per game: its switch, today's plays, and a link to its settings. Each game's page has only that game's settings, every one explained, so changing blackjack's rules or roulette's countdown, odds, and limits never means scrolling past fifty unrelated options. Pyacoin settings cover the games channel, who can play, daily check-ins, streaks, the ladder, cooldowns, giveaways, event grants, and the vault. The balances page shows the totals, today's games, and how players are doing against the house. Staff can also look up a member's account there.

{{< carousel images="{w-games.webp,w-economy.webp,w-coins-settings.webp,w-game-blackjack.webp,w-game-roulette.webp}" captions="{w-games.webp:The Games and pyacoins hub with a tile per game,w-economy.webp:Balances and the ledger with today's games and players against the house,w-coins-settings.webp:Pyacoin settings for check-ins and streaks and the vault,w-game-blackjack.webp:Blackjack settings with every option explained,w-game-roulette.webp:Roulette settings for the timed wheel and its odds and limits}" aspectRatio="16-9" interval="6000" >}}

The pages I care most about are the ones that let me check things before I change them, because they apply the same dry-run thinking as the lottery backpay to everyday decisions:

- **Fairness** shows today's server seed commitment, past days' revealed seeds, and how any result is checked.
- **Audit and refunds** checks every round of the season against the ledger and can refund rounds of games whose odds changed during the season. It's owner-only, and reading it changes nothing.
- **The economy simulator** answers "what would this rule have done?" before anyone switches it on. Pick a big-win tax, a daily winnings tax, or a daily wealth fee, choose a date range, and it shows what those rules would have done to members' balances over that range. It's read-only: nothing is written and nothing is posted.
- **Seasons** shows the current season and its settings, with a "preview the end of the season" dry run that shows exactly what would happen if the season ended right now.

{{< carousel images="{w-fairness.webp,w-economy-audit.webp,w-economy-simulator.webp,w-seasons.webp}" captions="{w-fairness.webp:Today's seed commitment and how a result is checked,w-economy-audit.webp:Every round of the season checked against the ledger with refunds,w-economy-simulator.webp:Trying a win tax and a wealth fee before switching them on,w-seasons.webp:The current season with a dry run of the season end}" aspectRatio="16-9" interval="6000" >}}

The rest of the economy has its own admin pages: the market's companies, prices, and settings, the stocks and funds members can trade with growth and holder counts, and trading card admin for importing sets, creating cards, and seeing collection stats. Two pages bring members into it. **Commissions** let members submit result messages for the games and card designs, and they earn pyacoins when staff accept them, with rotating **bounties** paying extra for the ones most needed. And the **card ideas** board tracks member suggestions from idea to done.

{{< carousel images="{w-game-market.webp,w-market-funds.webp,w-cards.webp,w-commissions.webp,w-commission-bounties.webp,w-card-ideas.webp}" captions="{w-game-market.webp:Market admin for companies and prices and settings,w-market-funds.webp:Stocks and funds with growth and holders,w-cards.webp:Trading card admin for importing sets and creating cards,w-commissions.webp:Commissions where members submit game messages and card designs,w-commission-bounties.webp:Rotating bounties for the commissions most needed,w-card-ideas.webp:The card ideas board from suggestion to done}" aspectRatio="16-9" interval="6000" >}}

## A bonus bug: logging inside a transaction

This one isn't economy code, but it's pyaaa-family code and too good a lesson to skip.

Nyerkulator can read world boss timers straight from the game and forward them through the server to the Nyerk bot, which posts them in Discord. At some point those forwarded timers started timing out. The bot's API was hanging for about **15 seconds**, and the server gives up after **10**, so every forward failed.

The cause: the bot was writing a log entry **inside the database transaction** that saved the timers, and the whole save sat waiting on it long enough to blow past the server's timeout. The fix was moving the log write to after the timers are saved, outside the transaction. Keep transactions as short as possible, and keep anything that isn't the actual data change (logging, network calls, notifications) out of them.

## Why the tests matter more here than anywhere

Economy code is the part of pyaaa where a bug costs people something they care about, even if that something is imaginary. A payout that's off by a bit, a prize that never gets paid, a refund that runs twice: none of that shows up in a quick manual test, and all of it adds up.

That's part of why pyaaa's test suite is as big as it is. The pre-merge check currently runs **4,539 tests**, plus a lint pass, a search for anything that shouldn't be public, and gitleaks over the full history, and it has to pass on a PR's exact final commit before that PR can merge. Across the merged PR history, **95% of pyaaa pull requests changed tests**. When agents are writing the code, the tests are a big part of how I know it does what I asked, and for the economy especially, "the odds didn't change" is something I want proven by a test, not promised in a PR description.

## Wrapping up

None of the machinery here is new. Commit-reveal and HMAC-derived results are well established, and append-only ledgers with reconciliation are how real accounting systems work. What I liked was applying the standards I'd want on a real system to something that's ostensibly just for fun: publish your commitments, prove your results, never edit history, check the books on a schedule, and make every bulk change a dry run first. A Discord full of people betting fake coins on blackjack turns out to be a surprisingly good motivator for getting that right.

As with the rest of the platform, the pyaaa repo is private and still in active development, so there's no code to link, but the numbers and examples here come from its docs, PR reviews, test runs, and the bot's own output.

The economy is only one part of what members see, so the next posts turn to the rest of it. [Part 8](/blog/2026/ai-agent-platform-part-8) covers the member experience across the app, the website, and Discord. [Part 9](/blog/2026/ai-agent-platform-part-9) covers how pyaaa manages the Discord server itself and the legion tools around it. [Part 10](/blog/2026/ai-agent-platform-part-10) covers raids, boss timers, and the party finder.
