# 🏆 World Cup App

![Version](https://img.shields.io/badge/version-3.0.1-blue)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active-success)

> **The most comprehensive FIFA World Cup companion built with React.**  
> Live Scores • Actual Bracket • Fantasy Bracket • Statistics • Historical Records • Team Profiles • Tournament Analytics

---

## 🌍 Overview

**World Cup App** is a modern, fast, and interactive FIFA World Cup companion designed for fans who want more than a static schedule.

It combines live match information, official-style tournament structure, bracket visualization, fantasy simulation, team profiles, historical data, tournament statistics, and a polished user experience in one React application.

The goal is simple:

> Build a World Cup experience that feels useful, beautiful, and complete.

---

## ✨ Features

### ⚽ Live Scores

Follow World Cup matches with live score updates, match status, and tournament context.

### 🏆 Actual Bracket

Explore the official tournament bracket structure, including knockout progression and Round of 32 logic.

### 🎮 Fantasy Bracket

Create your own tournament outcome by reordering groups, selecting third-place qualifiers, and simulating the knockout path.

### 📊 Tournament Stats

Review tournament-level data, standings, match outcomes, and team performance indicators.

### 📚 Historical Stats

Browse historical World Cup records, past winners, and legacy performance data.

### 👥 Team Profiles

Explore participating teams with flags, profiles, and tournament context.

### 🧩 Modern UI

Built with a clean React interface, responsive layouts, reusable components, and a product-focused design.

---

## 🖼️ Screenshots

Add screenshots here once the final UI is captured.

Recommended screenshots:

| Area | Suggested Image |
|---|---|
| Home | Main dashboard |
| Schedule | Match list and live scores |
| Bracket | Actual tournament bracket |
| My Bracket | Fantasy bracket simulator |
| Stats | Tournament analytics |
| Teams | Team profile page |

```md
![Home](docs/screenshots/home.png)
![Bracket](docs/screenshots/bracket.png)
![My Bracket](docs/screenshots/my-bracket.png)
```

---

## 🧱 Architecture

The app is designed around a clear separation of data, UI, tournament logic, and integrations.

```text
world-cup-app/
├── api/
│   └── livescores.js
├── src/
│   ├── components/
│   ├── data/
│   ├── engine/
│   ├── hooks/
│   ├── styles/
│   └── App.jsx
├── public/
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
└── VERSION.md
```

### Core concepts

- **React UI** for the main user experience
- **Vite** for fast local development and production builds
- **Vercel** for deployment
- **Serverless API route** for live score integration
- **Tournament engine** for bracket and qualification logic
- **Static data modules** for teams, fixtures, historical stats, and tournament metadata

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Deployment | Vercel |
| Styling | CSS |
| API Integration | Vercel Serverless Functions |
| Live Data | External football data API |
| Versioning | Semantic Versioning |
| Repository | GitHub |

---

## 🚀 Getting Started

### Prerequisites

Install:

- Node.js
- npm
- Git

### Installation

```bash
git clone https://github.com/southflorida15/world-cup-app.git
cd world-cup-app
npm install
```

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

---

## 🔐 Environment Variables

Live score functionality requires API credentials configured in Vercel.

Recommended variables:

```env
RAPIDAPI_KEY=your_api_key_here
RAPIDAPI_HOST=your_api_host_here
```

Do not commit secrets to the repository.

---

## 📚 Documentation

| Document | Purpose |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [ROADMAP.md](ROADMAP.md) | Product roadmap |
| [VERSION.md](VERSION.md) | Current release details |
| [AUTHORS.md](AUTHORS.md) | Project authorship |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |
| [SECURITY.md](SECURITY.md) | Security reporting |

---

## 🧭 Roadmap

The current focus is turning the app into a polished, reliable, and scalable World Cup companion.

Upcoming priorities include:

- Stronger live match coverage
- Improved broadcasting data
- Better match detail pages
- Expanded team profiles
- Richer tournament analytics
- More complete historical records
- Enhanced fantasy bracket scenarios
- Additional documentation and screenshots

See [ROADMAP.md](ROADMAP.md) for the full roadmap.

---

## 🤝 Contributing

Contributions, ideas, bug reports, and improvements are welcome.

Before contributing, please read:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

## 🔒 Security

Please do not publicly disclose security issues.

See [SECURITY.md](SECURITY.md) for responsible reporting guidelines.

---

## 🙏 Acknowledgements

This project is inspired by the global passion, history, drama, and community of the FIFA World Cup.

Special thanks to:

- Football fans around the world
- Open-source contributors
- React and Vite communities
- Vercel platform
- Public football data providers

---

## 📌 Project Status

**Current release:** `v3.0.1`  
**Status:** Active development  
**Deployment:** Vercel  
**Repository:** GitHub

---

## 🏁 Closing Note

World Cup App is built with the ambition of becoming a serious, polished, and genuinely useful tournament companion.

Not just a schedule.  
Not just a bracket.  
A complete World Cup experience.
