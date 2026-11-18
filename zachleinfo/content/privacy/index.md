---
title: "Privacy"
date: 2026-11-15T00:00:00-08:00
summary: "What this site collects, why, and who handles it."
description: "Privacy information for zachle.info: hosting, view and like counters, browser storage, and what is not collected."
showDate: false
showDateUpdated: true
showReadingTime: false
showWordCount: false
showViews: false
showLikes: false
showAuthor: false
showTableOfContents: false
sharingLinks: false
url: "/privacy"
showHero: false
showRelatedContent: false
thumbnailCard:
  kicker: "zachle.info"
  title: ["Privacy"]
  subtitle: "What this site collects, and what it does not"
---

This is a personal website. It has no accounts, no comments, no contact forms, and no advertising, and it does not sell or share data with anyone. The few things it does collect are listed below.

## Hosting

The site is served by [Cloudflare Pages](https://www.cloudflare.com/privacypolicy/). Like any web host, Cloudflare processes your IP address, browser user agent, and the pages you request in order to deliver the site and protect it from abuse. Cloudflare may set a short-lived security cookie when it needs to tell people and bots apart. I don't use Cloudflare Web Analytics or any other analytics service.

## View and like counters

Most pages show a view count and a like button. These counters run on Google [Firebase](https://firebase.google.com/support/privacy):

- When a page loads, your browser signs in to Firebase **anonymously**. This creates a random ID that isn't tied to your name, email, or any other account.
- The site stores a running total of views and likes for each page. It doesn't store who viewed or liked what.
- The Firebase code is loaded from Google's `gstatic.com`, and Google processes your IP address and browser details when your browser talks to Firebase, as described in its privacy policy.

The [status page](/status/) also sends one request to Firebase to check that the counters are reachable. Nothing about you is stored by that check.

## Browser storage

The site saves a few small values in your browser:

- which pages you have already viewed or liked, so a refresh doesn't count twice and the like button remembers its state
- your light or dark appearance choice
- Firebase's anonymous sign-in, which it keeps in your browser's IndexedDB

This data stays on your device. You can clear it at any time through your browser's site data settings, and the site works the same without it.

## What isn't collected

- No Google Analytics or other tracking scripts
- No advertising or social media trackers
- No fingerprinting
- No personal information, because there's nowhere on the site to enter any

## Third-party content

Links to other sites, like GitHub or LinkedIn, follow those sites' own privacy policies once you click through. Apart from the Firebase code above, fonts, scripts, images, and videos are all served from this site.

## Changes

If anything here changes, this page will be updated, and the date at the top will show when.
