# J.A.R.V.I.S. - Just A Rather Very Intelligent System

A voice-controlled AI assistant featuring a cinematic holographic interface, inspired by Iron Man's J.A.R.V.I.S. It integrates voice recognition, natural language processing, local AI inference, system control utilities, and a dynamic real-time 3D visualization core.

---

## Features

- **Voice Wake Word Detection**: Activate the system hands-free by saying "Jarvis."
- **3D Holographic Core**: A real-time canvas-rendered wireframe sphere that transitions between idle blue and active orange states.
- **Natural Language Processing**: Leverages Ollama for conversational AI using local large language models.
- **High-Performance Command Parser**: Executes pattern-matched commands instantly without needing AI processing.
- **System Operations**: Launch applications, manage files, terminate processes, capture screenshots, and adjust system volume.
- **Productivity Tools**: Create and manage notes, set timers, and schedule reminders with spoken alerts.
- **Calendar Integration**: Query daily schedules and upcoming events.
- **Translation Engine**: Translate text between English, Persian, and Spanish.
- **Browser Automation**: Open websites, execute web searches, and control media playback.
- **Text-to-Speech**: Delivers spoken responses with configurable personality and dramatic inflection.

---

## Technology Stack

### Frontend (React + Vite)
| Dependency | Purpose |
|------------|---------|
| React 18+ | Component-based user interface |
| Vite | Module bundler and development server |
| Framer Motion | Declarative animation and gesture library |
| Tailwind CSS | Utility-first CSS framework |
| Socket.io Client | Real-time bidirectional communication |
| Web Speech API | Browser-native speech recognition |

### Backend (Node.js)
| Dependency | Purpose |
|------------|---------|
| Express | HTTP server framework |
| Socket.io | WebSocket event handling |
| Ollama | Local AI model inference |
| node-cron | Scheduled task execution |
| open | Launch URLs or files in default applications |
| ps-list | Process enumeration |
| systeminformation | Hardware and OS metrics |
| screenshot-desktop | Screen capture utility |
| loudness | Audio control for Linux systems |
| nircmd | Audio and system control for Windows |
| fs/path | File system interaction |

### AI Model Configuration
- **Ollama** runs locally with supported models such as `llama3.2` or `mistral`.
- A custom system prompt configures the assistant's J.A.R.V.I.S. personality.

---

## Prerequisites

1.  **Node.js** version 18 or later.
2.  **Ollama** installed and active as a local service.
    - Download from [ollama.com](https://ollama.com)
    - Pull a model: `ollama pull llama3.2`
3.  **Operating System**: Windows (primary support) or Linux.
4.  **Microphone**: Required for voice command input.

---

## Project Structure

J-A-R-V-I-S/
├── server/
│ ├── index.js # Application entry point
│ ├── ai/
│ │ └── ollama.js # Ollama client and prompt management
│ ├── commands/
│ │ ├── appControl.js # Process and application launcher
│ │ ├── browser.js # URL opening and web search
│ │ ├── notes.js # Persistent note storage
│ │ ├── reminders.js # Reminder scheduling and alerts
│ │ ├── schedule.js # Calendar data interface
│ │ ├── systemControl.js # File, volume, and OS operations
│ │ ├── timer.js # Countdown timer logic
│ │ └── translate.js # Language translation service
│ ├── parsers/
│ │ └── fastParser.js # Regex-based command router
│ └── utils/
│ └── speech.js # Text-to-speech configuration
├── src/
│ ├── App.jsx # Root React component
│ ├── components/
│ │ └── JarvisCore.jsx # 3D holographic sphere renderer
│ ├── hooks/
│ │ └── useVoice.js # Voice recognition custom hook
│ └── services/
│ ├── socket.js # Socket.io client singleton
│ └── speech.js # Client-side speech synthesis
├── package.json
└── README.md

---

## Command Reference

### System State
| Command | Description |
|---------|-------------|
| "Jarvis" | Wake word to activate from idle. |
| "Go to sleep" / "Lock" | Return to idle monitoring state. |

### Time and Date
| Command | Description |
|---------|-------------|
| "What time is it?" | Announce the current time. |
| "What's the date?" | Announce Gregorian and Persian/Shamsi dates. |

### Calendar
| Command | Description |
|---------|-------------|
| "What's my schedule?" | List today's scheduled items. |
| "What's next?" | Announce the next upcoming event. |
| "Schedule for [day]" | Query schedule for a specific day. |

### Notes
| Command | Description |
|---------|-------------|
| "Add note: [text]" | Create a new note entry. |
| "List notes" | Display all saved notes. |
| "Delete note [number]" | Remove a specific note by index. |
| "Clear notes" | Delete all notes. |

### Reminders and Timers
| Command | Description |
|---------|-------------|
| "Remind me to [task] at [time]" | Schedule a reminder. |
| "List reminders" | Show all pending reminders. |
| "Set timer for [X] minutes" | Start a countdown. |
| "Check timer" | Report remaining time. |
| "Cancel timer" | Stop the active timer. |

### Translation
| Command | Description |
|---------|-------------|
| "Translate [word] to Spanish" | Translate English to Spanish. |
| "Translate [word] to Persian" | Translate English to Persian. |

### Applications and Browser
| Command | Description |
|---------|-------------|
| "Open [application]" | Launch a desktop application. |
| "Open [website]" / "Go to [url]" | Open a URL in the default browser. |
| "Search for [query]" | Execute a Google search. |
| "Open Spotify" | Launch the Spotify client. |

### System Control
| Command | Description |
|---------|-------------|
| "Take screenshot" | Capture and save the current screen. |
| "Set volume to [X]" | Adjust system volume (0-100). |
| "Mute" / "Unmute" | Toggle audio output. |
| "List files" / "Show desktop" | Display directory contents. |
| "Create file: [name]" | Create a new empty file. |
| "Read file: [name]" | Output file contents. |
| "Delete file: [name]" | Permanently remove a file. |
| "List processes" | Show running programs. |
| "Kill [process]" / "Close [app]" | Force-terminate a process. |
| "Run [program]" / "Start [exe]" | Launch an executable. |
| "System info" | Report CPU, RAM, and OS details. |
| "Disk space" | Report storage usage. |
| "Run: [command]" | Execute a raw terminal command. |

### General Intelligence
| Command | Description |
|---------|-------------|
| Any other question or statement | Routed to the Ollama language model for a generative response. |