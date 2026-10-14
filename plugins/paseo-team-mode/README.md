# Paseo Team Mode Plugin (`@getpaseo/plugin-team-mode`)

An independent, multi-agent coordinated team orchestration plugin for [Paseo](https://github.com/getpaseo/paseo).

Inspired by AIonUI's Team Mode, this plugin brings full multi-agent teamwork capabilities directly into Paseo without modifying a single line of Paseo's core repository.

---

## 🌟 Features

- **👑 Leader - Teammate Orchestration**: 1 Leader agent orchestrates, decomposes tasks, and delegates to specialized Teammates.
- **⚡ Parallel Multi-Agent Execution**: Run multiple agents simultaneously with independent models, contexts, or Git Worktree isolation.
- **🎨 Member Color Identity System**: Color-coded badges and chat columns for instant visual distinction between agent slots.
- **📊 Activity Kanban Board**: Interactive real-time task board with columns (`Backlog`, `In Progress`, `Blocked`, `Done`) and blocker tracking.
- **📬 Async Mailbox**: Asynchronous inter-agent messaging and result sharing.
- **🛡️ 100% Upstream Safe**: Zero merge conflicts when updating Paseo (`git pull origin main`).
- **📱 Multi-Platform**: Runs seamlessly across Desktop (Electron), Web, iOS, and Android.

---

## 🚀 Installation & Usage

### 1. Enable / Link Plugin in Paseo

Run from the root of your Paseo installation:

```bash
paseo plugin add ./plugins/paseo-team-mode
```

### 2. Access Team Mode

- Open Paseo Desktop or Web UI.
- Click on the **👥 Teams** icon in the sidebar navigation.
- Click **+ New Team** to create a team:
  - Choose team name and workspace isolation mode (Shared or Worktree).
  - Select your Leader provider and add Teammates.
- Switch between **Parallel Chat** view and **Activity Kanban** board anytime!
