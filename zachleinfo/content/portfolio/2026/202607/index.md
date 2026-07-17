---
title: "A GCP + Terraform + Cloudflare Demo"
date: 2026-07-03T14:00:00-07:00
tags: ["blog", "portfolio", "gcp", "terraform", "cloudflare", "cloud-run", "devops"]
summary: "Standing up a small GCP stack with Terraform, Cloud Run, Cloud SQL, and Cloudflare."
description: "A walkthrough of demo1, a GCP infrastructure project built with Terraform, Docker, Cloud Run, and Cloudflare."
keywords: "gcp, terraform, cloudflare, cloud run, devops"
url: "/portfolio/2026/gcp-terraform-demo"
---

## The gap

Nearly all of my hands-on infrastructure experience lives on a rack in my living room. Proxmox, VLANs, an OpenMediaVault share, the whole homelab I've written about before. This is great if someone asks me about virtualization or network segmentation. Not so great if someone asks me about managing cloud based infrastructure.

So instead of reading more about it, I built something on it.

Live at [demo1.zachle.info](https://demo1.zachle.info), source at [zle3/demo1](https://github.com/zle3/demo1), for anyone who wants to take a quick look at it.

<iframe
  src="https://demo1.zachle.info"
  title="demo1 live demo"
  loading="lazy"
  class="w-full rounded-md border border-neutral-200 dark:border-neutral-700"
  style="height: 640px;"
></iframe>

## What it actually is

A VPC, a couple of subnets, a Cloud Run service, a Cloud SQL database, and a pipeline that deploys it all when I push to main.

Everything is provisioned through Terraform. No console clicking, because I want everything to be repeatable (and I don't want to waste $30 on a forgotten EC2 instance again). The VPC has public and private subnets, Cloud NAT so anything in the private subnet can reach the internet without being reachable from it, and flow logging turned on so I can actually see what's happening on the network instead of guessing.

The firewall rules only allow internal traffic by default, nothing is exposed to the world unless I explicitly said so. Same instinct as my home network, just translated into `google_compute_firewall` blocks instead of a physical switch ACL.

### Two ways to run the same app

I deployed the demo app twice on purpose: once on Compute Engine, once on Cloud Run. Since the job postings I'm chasing name both, I figured it'd be good to get exposure to it. The VM gets its own dedicated service account, scoped down to read-only Artifact Registry access, because there's no way I'm not going to give least privilege to an account that I'll be interfacing with daily.

Cloud Run turned out to be the correct deployment strategy of the two. No servers to patch, scales to zero when nobody's looking at it, and it's a better fit for something this small. But I wouldn't have known that with any confidence if I hadn't also stood up the VM version to compare against.

### A database that isn't dangling on the open internet

Cloud SQL for PostgreSQL, reachable only over a private IP through a VPC connector. No public IP on the database, full stop. The app's DB password lives in Secret Manager and gets injected into Cloud Run at runtime rather than sitting in an environment file or, worse, the image itself. Small thing, but it's the kind of small thing that's the difference between a demo and a demo you'd actually let near real data.

### Push to deploy, with a hand on the brake

The part I was probably most excited about was the CI/CD pipeline, since I've done something similar for this very website but on Cloudflare. A Cloud Build trigger watches the GitHub repo. Push to `main` and it runs a lint/import check, builds the Docker image tagged with the commit SHA (not `latest`, so every build is traceable back to a specific commit), pushes it to Artifact Registry, and deploys to Cloud Run.

There's a manual approval gate before it actually ships, though. I've sat through enough change-control meetings in my day job to know that "it deploys automatically" and "it deploys automatically with someone's thumb over the button" are two very different levels of trustworthy, and I wanted the pipeline to reflect that.

### Cloudflare gets to keep its job

I already run Cloudflare for DNS and CDN on other projects, so rather than migrate everything to Cloud DNS and Cloud CDN just because it's the "native" option, I kept Cloudflare sitting in front of the GCP origin, full-strict TLS the whole way through. It felt like the more honest move: I already know this tool, so let it do a bigger job instead of learning a new one just to check a box.

## Proving it to myself, not just saying it

The laziest version of this project would've been a "hello world" container and a screenshot. Instead the demo app has a handful of endpoints whose only purpose is to prove the infrastructure underneath is real, since I didn't want to just take my own word for it either:

- `/api/verify` reads the GCP instance metadata and checks the incoming request headers for Cloudflare's fingerprints (`CF-Ray`, `CF-Connecting-IP`, `CF-IPCountry`), and reports whether the request landed on Cloud Run or the Compute Engine VM.
- `/api/docker` peeks at `/.dockerenv` and `/proc/1/cgroup` to confirm it's actually inside a container and not just pretending.
- `/api/db` opens a real connection to Cloud SQL over the private IP path and times the round trip.
- `/api/builds` calls the Cloud Build API and lists recent build history, so you can watch the pipeline's own receipts.
- `/api/uptime/history` pulls the last month of uptime straight from Cloud Monitoring.

If you don't believe any of it, the site will happily argue its own case for you.

## What's left

- Ansible for configuration management on the Compute Engine side, the same discipline I already lean on in the homelab, just pointed at GCP this time.
- Turning on Cloudflare's WAF managed ruleset and a rate-limiting rule, with Cloud Armor on the load balancer as a second, origin-side layer so I can actually compare the two instead of guessing which is better.
- Shipping GCP logs into my existing Grafana/Loki stack, because checking Cloud Logging in a separate tab is one tab too many.
- A proper runbook: architecture diagram, rollback steps, and at least one simulated failure, probably a bad deploy caught by the approval gate or a database failover.

To be clear about what this is and isn't: it's a personal project, not production experience, and I'm not going to pretend otherwise in an interview. But it turns "I haven't touched GCP" into "here's exactly what I built, and here's why I made each call," which is a much better position to argue from.
