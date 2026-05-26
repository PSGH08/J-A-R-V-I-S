// server/commands/notes.js
// Simple file-based note storage with add, list, delete, and clear functionality
const fs = require("fs").promises;
const path = require("path");

const NOTES_FILE = path.join(__dirname, "..", "data", "notes.json");

// Ensures the notes file and directory exist
async function initNotes() {
  try {
    await fs.mkdir(path.dirname(NOTES_FILE), { recursive: true });
    await fs.access(NOTES_FILE);
  } catch {
    await fs.writeFile(NOTES_FILE, JSON.stringify([]));
  }
}

// Reads and parses the notes file
async function readNotes() {
  await initNotes();
  return JSON.parse(await fs.readFile(NOTES_FILE, "utf-8"));
}

// Writes notes array to file
async function writeNotes(notes) {
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
}

async function addNote(noteText) {
  const notes = await readNotes();
  const note = { 
    id: Date.now(), 
    text: noteText, 
    created: new Date().toISOString() 
  };
  notes.push(note);
  await writeNotes(notes);
  return { success: true, speech: `Note added: "${noteText}"` };
}

async function listNotes() {
  const notes = await readNotes();
  if (notes.length === 0) return { success: true, speech: "No notes found, sir." };
  const list = notes.map((n, i) => `Note ${i + 1}: ${n.text}`).join(". ");
  return { success: true, speech: `You have ${notes.length} notes. ${list}` };
}

async function deleteNote(index) {
  const notes = await readNotes();
  const i = parseInt(index) - 1;
  if (i < 0 || i >= notes.length) return { success: false, speech: "Note not found." };
  const deleted = notes.splice(i, 1)[0];
  await writeNotes(notes);
  return { success: true, speech: `Deleted note: "${deleted.text}"` };
}

async function clearNotes() {
  await writeNotes([]);
  return { success: true, speech: "All notes cleared, sir." };
}

module.exports = { addNote, listNotes, deleteNote, clearNotes };