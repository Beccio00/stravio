##Architetture
┌─────────────────────────────────────────────────┐
│                   Supabase Cloud                │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Auth    │  │ Postgres │  │  Row Level    │  │
│  │ (login,  │  │ (sheets, │  │  Security     │  │
│  │ signup,  │  │ sessions,│  │  (coach vs    │  │
│  │ roles)   │  │ users)   │  │   allievo)    │  │
│  └─────────┘  └──────────┘  └───────────────┘  │
│        ▲              ▲                         │
└────────┼──────────────┼─────────────────────────┘
         │              │
    ┌────┼──────────────┼────┐
    │    │  PowerSync   │    │  (sync bidirectional)
    │    │  Cloud       │    │
    └────┼──────────────┼────┘
         │              │
    ┌────┴───┐    ┌─────┴────┐
    │ Mobile │    │   Web    │
    │ (Expo) │    │(Vercel)  │
    │ SQLite │    │ Supabase │
    │ locale │    │ client   │
    └────────┘    └──────────┘