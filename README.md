# Owed

A shared bill tracker for households. Track recurring and one-time bills,
get push reminders before they're due, and manage a monthly budget
together — built as an installable PWA.

## Features

- **Shared households** — sign in with an emailed one-time code (no
  passwords), then join a partner's household with a short invite code;
  bills, budgets, and income sync live between everyone in it
- **Bills** — monthly, yearly, or one-time bills with categories, due-date
  tracking, and per-month paid state
- **Push reminders** — configurable per-device reminder time, delivered via
  a scheduled job even when the app is closed, and skipped for anything
  already marked paid
- **Budget rings** — editable circular trackers (spending or savings goals)
  with quick manual expense entry and month-over-month history
- **Income tracking** — log paychecks as they arrive to see income against
  total budgeted spend for the month

## Stack

Next.js (App Router) · TypeScript · React · Supabase (Auth, Postgres, Row
Level Security, Realtime) · Resend (transactional email) · Web Push ·
deployed on Vercel
