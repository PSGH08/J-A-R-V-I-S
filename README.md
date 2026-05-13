# J.A.R.V.I.S. - Just A Rather Very Intelligent System

A voice-controlled AI assistant with a cinematic 3D holographic interface, inspired by Iron Man's Jarvis. Combines voice recognition, natural language processing, local AI (Ollama), system control, and a stunning real-time 3D canvas core.

---

## Features

- **Voice Wake Word**: Say "Jarvis" to activate
- **3D Holographic Core**: Real-time canvas-rendered wireframe sphere with blue (idle) and orange (awake) states
- **Natural Language AI**: Uses Ollama with local LLMs for conversational responses
- **Fast Command Parser**: Pattern-matched commands for instant responses (no AI needed)
- **System Control**: Open apps, manage files, kill processes, take screenshots, control volume
- **Timer & Reminders**: Set timers and reminders with spoken alerts
- **Notes**: Add, list, delete, and clear notes
- **Schedule**: Integration with calendar/schedule data
- **Translation**: English to Persian and Spanish translation
- **Browser Automation**: Open websites, search, play Spotify
- **Text-to-Speech**: Speaks responses aloud with dramatic/personality variations

---

## Tech Stack

### Frontend (React + Vite)
| Dependency | Purpose |
|------------|---------|
| React 18+ | UI framework |
| Vite | Build tool |
| Framer Motion | Animations & transitions |
| Tailwind CSS | Styling |
| Socket.io Client | Real-time communication with backend |
| Web Speech API | Voice recognition |

### Backend (Node.js)
| Dependency | Purpose |
|------------|---------|
| Express | HTTP server |
| Socket.io | WebSocket communication |
| Ollama | Local AI/LLM inference |
| node-cron | Scheduled tasks (reminders) |
| open | Open URLs/apps in default browser |
| ps-list | List running processes |
| systeminformation | System info (CPU, memory, disk) |
| screenshot-desktop | Take screenshots |
| loudness | Volume control (Linux) |
| nircmd | Volume control (Windows) |
| fs/path | File system operations |

### AI Model
- **Ollama** running locally with models like:
  - `llama3.2` or `mistral` for conversation
  - Custom system prompt for Jarvis personality

---

## Prerequisites

1. **Node.js** v18+ installed
2. **Ollama** installed and running locally
   - Download from [ollama.com](https://ollama.com)
   - Pull a model: `ollama pull llama3.2`
3. **Windows** (primary support) or **Linux**
4. **Microphone** for voice commands

---

## Project Structure

J-A-R-V-I-S/
├── server/
│   ├── index.js              # Main server entry point
│   ├── ai/
│   │   └── ollama.js         # Ollama AI integration
│   ├── commands/
│   │   ├── appControl.js     # Open/manage applications
│   │   ├── browser.js        # Browser automation
│   │   ├── notes.js          # Notes CRUD
│   │   ├── reminders.js      # Reminder system
│   │   ├── schedule.js       # Calendar/schedule
│   │   ├── systemControl.js  # System operations
│   │   ├── timer.js          # Timer functionality
│   │   └── translate.js      # Translation
│   ├── parsers/
│   │   └── fastParser.js     # Pattern-matching parser
│   └── utils/
│       └── speech.js         # Text-to-speech helpers
├── src/
│   ├── App.jsx               # Main React app
│   ├── components/
│   │   └── JarvisCore.jsx    # 3D holographic core
│   ├── hooks/
│   │   └── useVoice.js       # Voice recognition hook
│   └── services/
│       ├── socket.js         # Socket.io client
│       └── speech.js         # Client-side TTS
├── package.json
└── README.md

---

## Commands Reference

Wake & Sleep

Command	Description
"Jarvis"	Wake word (activates from idle)
"Go to sleep" / "Lock"	Returns to idle state

Time & Date

Command	Description
"What time is it?"	Current time
"What's the date?"	Gregorian + Persian/Shamsi date

Schedule

Command	Description
"What's my schedule?"	Today's schedule
"What's next?"	Next upcoming activity
"Schedule for Monday"	Any specific day

Notes

Command	Description
"Add note: [text]"	Create a note
"List notes"	Show all notes
"Delete note [number]"	Remove a note
"Clear notes"	Delete all notes

Reminders

Command	Description
"Remind me to [task] at [time]"	Set a reminder
"List reminders"	Show all reminders

Timer

Command	Description
"Set timer for [X] minutes"	Start a timer
"Check timer"	Check remaining time
"Cancel timer"	Stop the timer

Translation

Command	Description
"Translate [word] to Spanish"	English → Spanish
"Translate [word] to Persian"	English → Persian/Farsi

Apps & Browser

Command	Description
"Open Chrome" / "Open [app]"	Launch any application
"Open YouTube" / "Go to [site]"	Open website in browser
"Search for [query]"	Google search
"Open Spotify"	Launch Spotify

System Control

Command	Description
"Take screenshot"	Capture screen
"Set volume to [X]"	Adjust volume (0-100)
"Mute" / "Unmute"	Toggle audio
"List files" / "Show desktop"	Directory listing
"Create file: [name]"	Create empty file
"Read file: [name]"	Display file contents
"Delete file: [name]"	Remove a file
"List processes"	Show running programs
"Kill Chrome" / "Close [app]"	End a process
"Start notepad" / "Run [program]"	Launch executable
"System info"	CPU, RAM, OS details
"Disk space"	Storage usage
"Run: [command]"	Execute terminal command

General AI
Command	Description
Any question or request	Sent to Ollama AI for response
