---
title: "Cost of Infrastructure to 11/2024"
date: 	2024-11-01T12:57:40+08:00
tags: ["Blog"]
lastmod: true
summary: "Post Detailing Cost of Infrastructure to 11/2024"
description: "Post Detailing Cost of Infrastructure to 11/2024"
keywords: "cost"
url: "/blog/2024/cost-to-date"
---

## Wow what a nice server rack

Is what you're probably thinking. I also think it's nice, but a bit bare. However, for my needs, it does everything I want it to. The real question for all the aspiring home labbers out there is how much did it all cost.

## The true cost

**$3233.59**

There's the number, you can go now...

or stick around to find out why I bought each piece and for how much. Note: this doesn't include electricity cost or the associated costs with cooling.

## The beginning

I really wasn't planning on having a full sound proofed 26U rack in my living room, it just sorta happened. My initial plan was *just* one server in a 12U rack and calling it a day. But we know it doesn't stop there. My first expense incurred was the purchase of a domain name solely for the fanciness that comes with having a domain rather than a ip:port being distributed to friends. As I jumped into more hosting, I specifically wanted more drive storage for the purpose of having a second backup of my PC. Thus, I purchased a Dell PowerEdge T430.

### Enterprise Server Acquired

Why the T430? Well, it was a desktop format which was supposedly quieter. I also didn't have any rack so I thought I would just plug it in the corner and tuck it away. Additionally, during this time, 13th generation Dell was the premiere buy (currently at time of writing, I would pick up a 14th gen Dell x40 from r/homelabsales even though they're just hitting the market). At around $260, it was a bargain... or so I thought. It had 8x LFF HDD slots which means it could take the HDDs that go on sale regularly on Slickdeals or r/Buildapcsales.

Note: with foresight, I can highly recommend purchasing a Dell server with a valid iDRAC. Absolute lifesaver.

#### Server upgrades

The server I purchased was quite underpowered in terms of CPU and didn't have as much RAM as I would've liked. So I purchased 2x Intel Xeon E5-2690V4, 2x Dell 1100w 80+ Platinum CMPGM, Dell Power Supply Distribution Board 12PJJ, 2x Noctua NH-D9Dx i4 3U, 1x Noctua NF-P12 PWM, 1x Noctua NF-F12 iPPC 3000 PWM, Dell PowerEdge Front Bezel (for the aesthetic), and couple of 15a power cords.

Wait hold on. Why'd you buy all that? Let's go one by one.

1. CPU - more cores = more better right? Of course! But if you upgrade your CPUs to draw more power, you must also think about where the power draw is coming from and how the heat will be dissipated. So everything in my initial purchase was solely for the purpose of supporting the CPUs. $47
   1. Power Supply (PSU) - Why dual PSUs? They were the same price as the lower tier one so might as well get the higher tier one. But the PSU that was on the desktop was a single, thus the distribution board needed an upgrade as well. $46
   2. Fans/Cooling - Noctua. They're (supposedly) the quietest on the market but at a heavy price premium. I researched and found a couple of other labbers using this exact combination as a fan swap so why reinvent the wheel. Also purchased 2x cpu coolers to replace the stock ones. At $183, this was almost more expensive than the original machine.
2. Front Bezel - Just a child proof sort of thing to prevent simple tampering. It was going in my living room after all. $27
3. Power Cords - You'll never have enough of these since sellers usually never have the cords. I know since at all my workplaces, we have an abundance of these power cords but never the equipment it goes with. $19

### Quick scores

During my time scouring Craigslist, Offerup, Facebook Marketplace, Reddit, and Ebay, I found an absolute steal. 12th gen Intel Dell 7010 Micro for a fraction of a cost. I don't think the person who sold it to me knew the actual cost but I can't complain.

$100. That is an absolutely insane price. People are still buying 6th gen intel at that price.

I also picked up 5x 15a power cords for $4 each shipping included. Needless to say, I returned my $9.50 ones. Thanks Reddit.

### Retirement Home

In my household, instead of refreshing the oldest PCs, we practice a trickle down. Basically, I'm shelling out top dollar for the latest hardware and my old hardware gets slowly passed down. Thankfully, I have broke this cycle with our mobile devices with everyone on the latest phones but this will probably never happen with desktops. Anyways, it was time for me to upgrade to the 7700x combo from Newegg and my 1 year old 12th gen intel was passed on replacing a 8700k. I reclaimed the 8700k and began its next life.

### Planning

Now that I had another CPU and a couple of other parts to be reused,
