# J.A.R.V.I.S.
## Just A Rather Very Intelligent System

A cinematic, voice-controlled AI assistant inspired by Tony Stark’s J.A.R.V.I.S.

J.A.R.V.I.S. combines real-time voice interaction, local AI inference, holographic-style visualization, system automation, and intelligent command execution into a fully immersive desktop assistant experience.

---

# Features

## Voice Interaction
- Wake-word activation using **“Jarvis”**
- Real-time speech recognition
- Natural conversational responses
- Dynamic speech synthesis with personality control
- Hands-free operation

---

## Holographic Interface
- Animated 3D holographic core
- Reactive audio visualization
- Smooth idle/active transitions
- Cinematic blue/orange energy states
- Framer Motion powered animations
- Fully responsive futuristic UI

---

## Artificial Intelligence
- Local AI inference powered by **Ollama**
- Support for models like:
  - `llama3.2`
  - `mistral`
- Context-aware conversations
- Custom J.A.R.V.I.S. personality prompt
- Fast regex-based command routing for instant actions

---

## System Automation
- Launch and close applications
- Execute terminal commands
- Process management
- File system operations
- Screenshot capture
- Volume and audio control
- Hardware and OS monitoring

---

## Productivity Tools
- Notes management
- Timers and countdowns
- Smart reminders
- Schedule and calendar integration
- Spoken notification alerts

---

## Browser & Media Control
- Open websites instantly
- Perform web searches
- Control media playback
- Launch Spotify and other applications
- Browser automation support

---

## Translation Engine
Supports translation between:
- English
- Persian
- Spanish

---

# Technology Stack

# Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Lightning-fast build tool |
| Tailwind CSS | Modern utility-first styling |
| Framer Motion | Advanced animations |
| Socket.io Client | Real-time communication |
| Web Speech API | Browser speech recognition |

---

# Backend
| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express | Backend server |
| Socket.io | Real-time websocket communication |
| Ollama | Local AI inference |
| node-cron | Task scheduling |
| systeminformation | Hardware monitoring |
| screenshot-desktop | Screen capture |
| ps-list | Process management |
| open | Open files/apps/URLs |
| loudness / nircmd | Audio control |
| fs / path | File system access |

---

# AI Configuration

J.A.R.V.I.S. uses **Ollama** locally for private and fast AI inference.

Example supported models:

```bash
ollama pull llama3.2
ollama pull mistral