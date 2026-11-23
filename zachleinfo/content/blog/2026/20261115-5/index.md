---
title: "Building a Game Community Platform with AI Agents, Part 5: Fixing Minimap Tracking from User Reports"
date: 2026-11-15T14:04:00-08:00
tags: ["ai", "claude-code", "rust", "computer-vision", "ocr", "aion-2"]
categories: ["blog"]
series: ["building a game community platform with ai agents"]
series_order: 5
summary: "Three user reports, one stubborn minimap: how Radar went from mistaking the HP bar and skill bar for a minimap to finding it by the icons on its frame, why the player's dot kept running ahead and snapping back, and how a nameplate drawn over the chat turned \"hopefully\" into \"nopefully\"."
description: "Part 5 of a series on building an Aion 2 community platform with AI coding agents: fixing minimap detection, position tracking, and chat OCR from real user reports, with before and after detector output."
keywords: "minimap detection, screen reading, ocr, template matching, windows graphics capture, user reports, rust, ai agents, aion 2"
url: "/blog/2026/ai-agent-platform-part-5"
showHero: false
thumbnailCard:
  kicker: "AI Agent Platform · Part 5"
  title: ["Fixing Minimap Tracking", "from User Reports"]
  image: minimap-before-after.webp
  focus: center
  fit: contain
---

[Part 1](/blog/2026/ai-agent-platform-part-1) covered what the platform is and how the work splits between me and the agents. This part is about the least glamorous and most humbling part of the whole project: user reports. Specifically, a run of them that all came back to the same small rectangle in the corner of the screen, the minimap, and one about the chat box that I still think is kind of funny.

Quick reminder of the ground rules, because they're the reason any of this is hard. Nyerkulator reads the game passively. It watches the game's network traffic and it reads the screen, and that's all. It never touches game memory, so there's no "just ask the game where the camera is pointing." If the app wants to know which way you're facing, it has to look at the minimap like a person would, and work it out from the picture.

## Why the minimap matters so much

The game tells the app where the player is, but not constantly. Position comes in through the traffic every so often, and in between those updates the app would otherwise be guessing. So Radar reads the minimap's camera cone, up to 60 times a second, and uses it to turn and move its own map and the screen pointer between position updates. The minimap also feeds a motion tracker that follows how the map scrolls under the player marker, which is how the dot keeps moving smoothly instead of teleporting from one position update to the next.

![The game's minimap in the top-right corner: zone name, the circular map with the player marker and camera cone, a bookmark star and filter icon to the left, the clock and swap arrows along the bottom edge, with the HP bar below it and the quest tracker blurred](game-minimap.webp)

Where that pays off is the screen pointer, the 3D arrow Radar draws over the game pointing at a Hidden Cube. Here's the real cube clip from Part 1 frozen at three moments. The arrow reads "55 m · 7 m down" on the approach, counts down to 5 m, and turns into a ring once you're within 4 m. For the arrow to point the right way on your screen, the app has to know which way *your camera* is facing, and the only place it can learn that is the minimap in the top-right corner of every one of these frames.

{{< carousel images="{cube-approach.webp,cube-at-5m.webp,cube-ring.webp}" captions="{cube-approach.webp:Approach with the arrow reading 55 m and 7 m down (composite),cube-at-5m.webp:At the cube with the arrow at 5 m (composite),cube-ring.webp:Within 4 m the arrow becomes a ring while the cube opens (composite)}" aspectRatio="16-9" interval="6000" >}}

Those are composites, same as the video: the game picture is my own recording, and the arrow and Radar window are the app's real per-frame output replayed from that session's traffic. The pointer in them runs on my own Radar settings, size 160 with a −140 offset, 0.85 opacity, rings on, and the sphere off. [Part 1](/blog/2026/ai-agent-platform-part-1) has the full story of how the clip was put together, and [Part 8](/blog/2026/ai-agent-platform-part-8) goes through the pointer and the rest of the app from a member's point of view.

That's the happy path: default layout, minimap in its usual top-right spot, game window in front, nothing covering it. Every report in this post is someone stepping off that happy path in a perfectly reasonable way, and Radar falling over because of it.

## How the reports came in

The reports were numbered, and they came with a description and, where possible, screenshots, videos, or a debug dump from the app. The app has a Status and logs page for exactly this: it shows what every tool thinks is going on right now, and it can export the log so a report arrives with the app's side of the story attached.

![The app's Status and logs page from a demo replay: capture counts, the Radar section with the map, the last position from the game, minimap tracking with its scale in units per minimap width, cube counts, and sections for Nyerk, Combat, Duty, Pets, Market, and the Tile puzzle helper](status-logs.webp)

That screenshot is from a demo replay, not a real session, but notice the Radar line that says "minimap tracking" and the scale it's using in units per minimap width. Hold on to that, it matters for report 8. Uploaded logs also get the Windows user name and computer name masked on the PC before they leave it, which [Part 4](/blog/2026/ai-agent-platform-part-4) covers.

The reporters' actual screens became test fixtures in the repo, so every fix had to pass on the exact picture that broke it, and every future change has to keep passing on it too. That last part matters more than it sounds. Without it, fix number three quietly undoes fix number one and nobody notices until the same person reports the same bug again.

## Report 7: the minimap was reading a browser

The first one sounds silly once you know the answer. Minimap marks, the screen pointer, and the distance to a cube all went wrong for someone while a browser window was covering part of the game. The reason: the app was copying pixels off the screen where the minimap *should* be, and when a browser was sitting on top of it, it was very faithfully reading the browser. It tried its best to find a camera cone in a web page and, unsurprisingly, came up with nonsense. On top of that, a minimap that had been moved or resized in the game's settings broke readings too, since the app assumed the default spot.

The fix had two parts:

- **Check before you read.** Before trusting the minimap pixels, the app asks Windows what's actually on top at that spot with `WindowFromPoint`. If something other than the game covers the minimap, it doesn't read the screen copy.
- **Read the game's own picture instead.** When the game is covered, the app grabs the game window's own frames through Windows Graphics Capture, which gives you what the game drew regardless of what's on top of it. If that isn't available, the app skips the reading entirely rather than guessing.

That second bullet is a pattern I keep coming back to across this whole project: when you don't know, say you don't know. A skipped reading costs a fraction of a second of slightly less smooth movement. A wrong reading sends the arrow pointing at a rock.

To deal with moved and resized minimaps, the app also searched for the minimap box instead of assuming where it was, and threw out lookalike boxes using **edge density**: the share of pixels in a box that have a strong brightness step. The thinking was that a minimap is mostly smooth map texture, while busier UI elements are full of hard edges. The original cutoff was picked on calm, default-sized minimaps, and on those it held up fine. For a while.

## Report 9: it thought the HP bar was a minimap

Then report 9 came in, and it's the reason this post exists. Someone had made their minimap smaller and moved it to the bottom left, on a 1920x1080 screen. Radar didn't find it. Worse, it found something else and was confident about it: first the quest tracker, then the HP bar, and it read a constant camera direction off of them for minutes at a time. After a resize to 2560x1440, it moved on to following the skill bar for about a minute.

Here's the old detector's real output on the screens from that report:

{{< carousel images="{minimap-before-after.webp,minimap-before-skillbar.webp}" captions="{minimap-before-after.webp:Report 9 at 1080p. The old search boxes the HP bar and quest tracker and misses the real minimap,minimap-before-skillbar.webp:Report 9 after a resize to 1440p. The old search chases the skill bar}" aspectRatio="16-9" interval="6000" >}}

Look at the numbers on those slides. On the 1080p screen, the lookalikes measured 41 to 44% edge pixels, and the real minimap measured 33%. That's not a gap you can put a cutoff in with any confidence. The 1440p screen was worse: real minimap at 26%, skill bar boxes at 33% and 28%, quest tracker at 32%. Across these screens the real minimaps landed between 26 and 33% and the lookalikes between 28 and 44%. The ranges overlap. Edge density just can't tell them apart once the minimap gets small and the rest of the HUD is busy, and no amount of tuning the threshold was going to fix that.

The inset in the corner of the 1440p slide is the app's own debug dump from version 1.2.x, showing the skill bar boxes it was happily following. That dump is a big part of why this got fixed properly: it showed exactly what the old detector believed, instead of me having to guess.

A word on how those slides were made, since "before and after" images are easy to fake. The rose boxes are real detector output (the app draws them red; the slides were recoloured to match this site). A small scratch program called the app's own minimap code, first the box search in the top-right 60% by 60% corner where it normally looks, then the coarse search over the whole screen, each run repeated with earlier finds blocked out so you can see everything it would have accepted. The edge percentages come from the same measure the app uses: the share of pixels inside the middle three quarters of the box with a brightness step above 10. Nothing on the "before" slides is drawn in by hand except the labels and the grey outline showing which corner the old search covered. The game's chat and the character name and legion tag are blurred, and I've also blurred the quest tracker text and currency for this post.

### Finding it by its icons instead

The question that unstuck this was simple: what does the minimap have that nothing else on screen has? Not texture, not edges, not a rough shape. It has **icons on its frame**. A map icon in the top corner, a pair of swap arrows in the bottom corner, a bookmark star off to the side. Those exist around the minimap and nowhere else, at any size and any position.

So the detector changed from "find a box that looks like a map" to "find these three icons," searched over a wide range of scales, from 720p up to 1440p. Once the icons are found, they pin down the map's box. The player's marker disc in the middle then gives the exact center and the zoom level from its size, and the camera direction gets read around that disc.

{{< carousel images="{minimap-icons-closeup.webp,minimap-after-1440p.webp}" captions="{minimap-icons-closeup.webp:What the icon search keys on. Map icon and swap arrows and bookmark star plus the marker disc,minimap-after-1440p.webp:The same 1440p screen that chased the skill bar. Found by its icons}" aspectRatio="16-9" interval="6000" >}}

The scores are worth a look. On the 1080p report 9 screen, the icon search matched the map icon at 0.90, the swap arrows at 1.00, and the star at 0.91. It read the camera at 272° around the marker disc. On the 1440p screen it was arrows 1.00, star 0.62 against a bright sky, and map icon 0.55 because the game draws it highlighted there. The skill bar has none of those icons at all. Not every icon is a perfect match on every screen, which is exactly why the detector uses three of them instead of betting on one.

One honest footnote on those slides: the green boxes on the map icon, the arrows, and the marker disc are real output from the app's icon search and marker finder. The bookmark star box isn't, quite. The icon search only reports *how well* the star matched, not where its box is, so the star's box on the slide was placed from the detector's own layout constants for where the star sits relative to the arrows. Same place the detector looks, drawn from its numbers rather than its output.

A few more rules came along with the icon search, all aimed at not getting fooled again:

- **Trust has to be earned.** A box found outside an area that's already confirmed, or one the user framed by hand, is only trusted once it *behaves* like a minimap: the same box and marker disc seen at least 3 times over 1.5 seconds, while the player is turning or scrolling. An HP bar doesn't have a marker disc that rotates when you turn the camera.
- **Read the camera around the marker, not the box.** If the box is a few pixels off, the reading stays right.

On report 9's screens, the marker now lands within 1.5 pixels of the map center.

### "If the HUD moves, the overlay stops working for the minimap"

That's the follow-up report, from me this time, and it's a good example of a fix being right but not finished. With the icon search in place, the app found the minimap correctly. But if you moved the HUD mid-session, re-finding the minimap afterward took **almost two minutes**. The app kept holding on to the minimap's old position for far too long before going looking for it again.

The fix: as soon as a lock loses its frame icons, it's released immediately, and the whole window gets searched by those icons right away, then on a backoff schedule if nothing turns up. The icon search takes about 0.3 seconds at 1080p, and a whole-screen search on a 4K screen comes in around 60 ms. Two minutes to well under a second, for what's basically "stop holding on to something that isn't there anymore." Making that search fast in the first place is its own story, and it's in [Part 6](/blog/2026/ai-agent-platform-part-6).

## Report 8: the dot ran ahead and snapped back

Report 8 was a different kind of wrong. The minimap was found fine. The player's dot on Radar's map would run ahead of where the player actually was, and then snap back 20 to 25 meters every time a real position update came in from the game. Run, snap, run, snap.

This one came from the motion tracker I mentioned at the top, the part that follows how the minimap scrolls to fill the gaps between position updates. To turn "the minimap scrolled this many pixels" into meters, it needs to know the minimap's scale, the same "units per minimap width" number on the Status page above. An older tracker had been *learning* that scale over time, and it had learned it badly: 30,446 units per minimap width, where the real value is about 20,300. About 50% too big. So every bit of movement got stretched by half, the dot sprinted ahead, and the next real position yanked it back. On top of that, tracking was getting lost about a third of the time while riding over plain ground, where there isn't much on the minimap texture to follow.

The fix:

- **Throw out the old learned scales.** Anything learned by the old tracker got discarded instead of trusted.
- **Only re-measure under good conditions.** The scale is now re-measured only over unbroken stretches of up to 30 seconds, and only to values the minimap's zoom levels can actually produce. If a measurement says something the game can't do, it's wrong, and it gets ignored.
- **Carry on instead of starting over.** When the older reference image fades out, the tracker continues from the latest minimap frame rather than resetting, which is what was losing it on plain ground.

The reporter had two riding videos, about 80 seconds and 4,800 frames in total, and they became the test. I'm not showing them here, since they're someone else's recordings. On those, the minimap is now followed on **100% of frames**, up from 64%. The average path error, which had been 12 to 13 meters and up to 33, dropped to **1.2 to 1.8 meters**. The jump when a real position comes in is now at most 3 meters, which on a map you're glancing at while playing is basically invisible.

That "only values the game can produce" rule is one I'd recommend to anyone doing measurement off of real-world data. A learned value with no sanity bounds will eventually learn something wrong, and then it'll be confidently wrong for the rest of the session.

## The chat box that said "nopefully"

The last one isn't the minimap, but it's the same kind of problem and I couldn't leave it out. One of the tools is the Legion chat relay, which the app calls Legion Feed: it reads our legion's chat off the screen and the server posts it into a Discord channel under each character's name. It's OCR, more or less: it matches each character in the chat box against the game's own font. Legion Feed is a staff-only tab, so it's hidden even in the replay renders the rest of the app screenshots come from. What it reads looks like this:

![A crop of the game's legion chat box showing five gold "Legion Member ... logged in." lines, with the member names blurred](legion-chat.webp)

A user report on October 30th: sometimes the bot posted a run of `□` boxes instead of a message, or swapped letters, so "hopefully" came out as "nopefully." The cause turned out to be the game itself drawing things on top of the chat. When a world nameplate, for example "Water Spirit," was drawn over a chat line, its letters got mixed in with the chat's letters, and the OCR did its best with a picture that was now two pieces of text on top of each other.

You can't stop the game from drawing nameplates, so the fix is about noticing when it happens:

- **Spot the overlay.** Nameplates have thin, dark-outlined strokes in strong colors the chat never uses. A line with at least 12 pixels of that gets marked as overlaid. For a sense of the margin, the research captures of clean chat have at most 6.
- **Wait it out.** An overlaid message isn't posted right away. It waits until the nameplate has moved off the line.
- **Never post a guess.** If the overlay is still there after about a minute, the message is skipped and logged. It's never sent as read. Same rule as the minimap: a missing line is better than a wrong one in a channel people actually read.

There was a related fix for characters the bot's copy of the font didn't have yet. Those get named once on an admin page, the names on the legion roster act as votes for what each one probably is, and the bots pick up the result.

What happens on the Discord end, the live posts under each character's name and picture, the doorbell for join notices, the maintenance notices, and the admin page for the reader's health, is all in [Part 9](/blog/2026/ai-agent-platform-part-9). The chat reader also got a lot faster around the same time, 14 times faster with output that stayed identical on every test image. That's a story about proving a speedup doesn't change anything, so it's in [Part 6](/blog/2026/ai-agent-platform-part-6).

## What I took away from these

None of these bugs were exotic. Someone covered the game with a browser. Someone moved their minimap. Someone rode a mount across a field. Someone was chatting while a monster walked past. That's just people playing the game, and every one of them broke an assumption that only held on my own setup.

A few things I'd do the same way again:

- **The reporter's screen is the test.** Every one of these fixes was checked against the exact pictures or videos from the report, and those stayed in the repo as fixtures. The before and after images in this post are the detector's real output on those same screens, not mockups, with the one hand-placed star box called out above.
- **Debug dumps pay for themselves.** The 1.2.x dump showing exactly which boxes Radar was following turned report 9 from "it's broken for me" into a precise picture of what the detector believed. If your tool reads the world, make it easy for users to show you what it saw, which is the whole job of the Status and logs page.
- **Pick features that only the real thing has.** Edge density described something lots of UI elements share. The frame icons described something only the minimap has. Most of the robustness came from that one change in what we were looking for.
- **Say "I don't know" instead of guessing.** Skip the reading when the game is covered. Don't trust a box until it behaves. Ignore a scale the game can't produce. Don't post a chat line you couldn't read cleanly. Almost every fix here was some version of that.

And on the AI side of things: the agents wrote these fixes, but handling the reports, reproducing the bugs, deciding what "fixed" meant and checking the result in the actual game were on me. That split works well for bugs like these. The detective work of "what's actually different about this person's screen" is where most of the time goes, and once that's written down clearly with the right test images attached, the implementation is the comparatively easy part.

Next up in [Part 6](/blog/2026/ai-agent-platform-part-6): making the app a lot faster in a bunch of places while proving, test image by test image and recording by recording, that not a single output changed.
