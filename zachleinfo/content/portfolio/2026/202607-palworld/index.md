---
title: "Self-Hosted Palworld Server Platform"
date: 2026-07-14T18:00:00-07:00
tags: ["blog", "portfolio", "palworld", "docker", "homelab", "discord"]
summary: "A self-hosted Palworld game server for a ~200-member Discord community: Proxmox and LGSM, a restart-vote Discord bot, offsite backups, a Docker Compose stack, a public status page, and the dependency map and knowledge graph used to keep it all honest."
description: "Full showcase of a self-hosted Palworld dedicated server platform: infrastructure, a Discord bot, offsite backups, containerization, a public status page, and the dependency/knowledge-graph tooling used to audit it."
keywords: "palworld, lgsm, proxmox, docker, discord bot, homelab, dependency mapping, knowledge graph"
url: "/portfolio/2026/palworld-server-showcase"
---

## What this is

A dedicated Palworld game server, self-hosted on my own Proxmox hardware, in my own living room, for a Discord community of roughly 200 members with around 20 people online swinging pickaxes at peak. This isn't a "spun it up once for a screenshot" homelab demo. It's been in continuous operation, has automated backups that actually leave the building instead of just sitting on the same disk, a Discord bot the community uses to vote on restarts instead of pinging me directly, a public status page that can survive being linked into a large Discord without quietly becoming an attack surface, and, most recently, a full dependency map and a generated knowledge graph of the project used to audit it for drift and duplicated secrets, because at some point the thing got big enough that I stopped trusting my own memory of it.

The build log is written up in four parts on the blog, roughly in the order the bugs happened to me:

- [Part 1: Foundation and Digging In](/blog/2026/self-hosted-palworld-part-1)
- [Part 2: Bot and Backups](/blog/2026/self-hosted-palworld-part-2)
- [Part 3: Going Public](/blog/2026/self-hosted-palworld-part-3)
- [Part 4: Making It Reusable](/blog/2026/self-hosted-palworld-part-4)

This page is the showcase version, the architecture as it stands today, plus the two audit artifacts, a dependency map and a knowledge graph, that came out of actually stopping to look at the whole system at once instead of chasing the next feature request forever.

Source at [zle3/palworld-ops-toolkit](https://github.com/zle3/palworld-ops-toolkit).

## Architecture

{{< mermaid >}}
flowchart TD
    subgraph Cloud["Open Internet &amp; Cloud Providers"]
        Visitors["Status page visitors"]
        CFEdge[["Cloudflare<br/>(edge network, tunnel termination)"]]
        DiscordCloud[["Discord<br/>(gateway, slash commands)"]]
        Players["Discord community<br/>(~200 members, ~20 concurrent players)"]
        Visitors --> CFEdge
        DiscordCloud --- Players
    end

    subgraph NAS["OpenMediaVault NAS"]
        SMB["SMB share<br/>(scoped service account)"]
    end

    subgraph Stack["Docker Compose stack, on the VM"]
        CF["cloudflared<br/>(outbound tunnel only)"]
        Nginx["status-nginx<br/>(no published port)"]
        Bot["discord-bot<br/>(host networking, bind-mount)"]
        CF -->|TLS, Origin CA| Nginx
        Nginx -->|reads snapshot| Bot
    end

    subgraph VM["Proxmox VM, Ubuntu Server (minimized)"]
        LGSM["LinuxGSM (LGSM)"]
        Pal["Palworld dedicated server"]
        REST["REST API :8212<br/>(localhost only)"]
        LGSM --> Pal
        LGSM --> REST
    end

    subgraph Router["Home Network Edge"]
        VLAN["DMZ-equivalent VLAN<br/>(Port-Forwards / UPnP segment)"]
    end

    DiscordCloud -->|slash commands, vote UI| Bot
    CFEdge -.->|Cloudflare Tunnel, outbound-initiated| CF
    Players -->|game client, UDP| VLAN
    VLAN -->|port-forward| Pal
    Bot -->|REST calls| REST
    Bot -->|pwserver restart| LGSM
    LGSM -->|"host cron: backup, then offload (copy, verify, delete)"| SMB
{{< /mermaid >}}

The shape worth noting: the only thing actually exposed to the internet is the game's UDP port, forwarded into a segment built specifically for that purpose, plus a status page reached through an outbound-only tunnel with no inbound port opened for it at all. RCON, the REST API, and SSH all stay internal or tunnel-only, full stop. The status page itself never queries the game server live either, it serves a pre-rendered snapshot the bot writes every 60 seconds, so if this thing ever gets hugged to death in a Discord, a traffic spike just hits static nginx content and never comes anywhere near the origin.

## The dependency map

Once the project had enough moving parts, non-secret config plus secrets plus deploy scripts, that were duplicated across multiple files without me really noticing it happening, I built a dependency and secrets map by grepping the actual current state of every script and config file instead of trusting my own memory of what I'd written six weeks earlier. Good call, because it caught a real, genuinely embarrassing bug: `setup/03-firewall.sh` had silently drifted, still opening the *original* default game port from early in the build, not the port actually in use since a mid-project change. The game's `.ini` and LGSM's launch config both agreed on the current port. The firewall script alone hadn't been touched since. A rebuild from these scripts, run today with no changes, would have quietly firewalled off the wrong port and I never would've known until something broke.

The map also surfaced the actual shape of the secrets problem, which turned out to be narrower than I'd assumed going in:

- The Discord bot token and Cloudflare Tunnel credentials were already correctly out-of-repo, generated and entered directly on the live host rather than committed anywhere. One thing I apparently did right the first time.
- The real duplication was contained to a handful of shell scripts each independently hardcoding the same admin and NAS passwords, five copies of one password scattered across the setup scripts and the Docker `.env` file combined.
- A non-secret service account username showed up independently in roughly nine different files, which is less of a security problem and more of a "future me is going to miss one of these during a rotation" problem.

That map is what justified the Ansible/vault consolidation, and it's also what justified containerizing the Discord bot and status page in the first place: the map's own stated goal, consolidate, automate, stop duplicating secrets, is close to exactly what a `.env` file shared across Compose services is for. One secret defined once beats the same value copy-pasted into five scripts, which is precisely the failure pattern the map had just finished cataloguing in painful detail.

## The knowledge graph

Separately, I ran the project's documentation, build notes, and source through a graph-extraction pass to get an outside view of how all the pieces actually connect, rather than just the view already sitting in my head from having built the thing piece by piece.

- **180 nodes, 250 edges, 25 communities** extracted from about 28,000 words of build notes and source.
- **74% of edges extracted directly from the text, 26% inferred** by the model reasoning about connections that weren't stated outright, average inferred-edge confidence 0.86.
- The **highest-connectivity nodes** in the whole graph were the status page's rendering function, the restart-vote UI component, the bot's background polling loop, and the Discord Compose service itself, which lines up with intuition: those are the pieces everything else in the bot ultimately routes through anyway.
- The graph flagged its own **inferred connections for verification** rather than just asserting them as fact. For example, several edges linking the status page's chart-rendering code to the bot's polling loop got surfaced as "probably related, not confirmed from the text directly." Genuinely useful property in a tool like this, it actually tells you what it read versus what it guessed instead of blending the two.
- It also surfaced a **structural observation I hadn't consciously named myself**: the non-secret config duplication table and the "containerize the bot" decision were the two highest-betweenness nodes in the whole graph, meaning they were the actual bridge concepts connecting the infrastructure side of the project to the Discord-bot side. In hindsight that's obviously true, the dependency map is literally what justified the container migration, but watching it fall out of edge centrality instead of my own narrative was a genuinely different, kind of validating way of confirming something I already believed.

None of this replaced the actual debugging instinct that got the project working in the first place, trust logs and actual resolved state over assumptions, isolate one variable at a time, which shows up constantly across all four build-log posts. What the dependency map and the graph added was a second pass, after the fact, that looked at the system as a whole instead of one bug at a time, and both of them found something the phase-by-phase build process alone had completely missed.

## Where it stands

Running, backed up on a schedule with offsite copies verified before the local copy is ever deleted, alertable to Discord for both LGSM's own status events and player-initiated restarts, containerized where it made sense and left alone on bare metal where re-platforming would've been a worse trade for no real benefit, and fronted by a status page that's structurally incapable of becoming the thing that takes the server down. The dependency map's own recommendation, collapsing the setup scripts into a proper vault instead of five scripts each hardcoding the same passwords, is now actually done: the whole stack has been rebuilt as a reusable Ansible playbook with `ansible-vault`-encrypted secrets in a separate repo ([zle3/palworld-ops-toolkit](https://github.com/zle3/palworld-ops-toolkit)), tested on a disposable VM before it ever touched anything real, so a password rotation is a one-line change instead of a grep-and-fix pass across five files, and the live server stays exactly where it's always been, untouched, as the running reference the whole toolkit was built from.
