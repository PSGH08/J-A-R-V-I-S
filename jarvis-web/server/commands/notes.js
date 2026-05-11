const fs = require("fs").promises;
const path = require("path");

const NOTES_FILE = path.join(__dirname, "..", "data", "notes.json");

async function initNotes() {
  try {
    await fs.mkdir(path.dirname(NOTES_FILE), { recursive: true });
    await fs.access(NOTES_FILE);
  } catch {
    await fs.writeFile(NOTES_FILE, JSON.stringify([]));
  }
}

async function addNote(noteText) {
  await initNotes();
  const notes = JSON.parse(await fs.readFile(NOTES_FILE, "utf-8"));
  const note = { id: Date.now(), text: noteText, created: new Date().toISOString() };
  notes.push(note);
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
  return { success: true, speech: `Note added: "${noteText}"` };
}

async function listNotes() {
  await initNotes();
  const notes = JSON.parse(await fs.readFile(NOTES_FILE, "utf-8"));
  if (notes.length === 0) return { success: true, speech: "No notes found, sir." };
  const list = notes.map((n, i) => `Note ${i + 1}: ${n.text}`).join(". ");
  return { success: true, speech: `You have ${notes.length} notes. ${list}` };
}

async function deleteNote(index) {
  await initNotes();
  const notes = JSON.parse(await fs.readFile(NOTES_FILE, "utf-8"));
  const i = parseInt(index) - 1;
  if (i < 0 || i >= notes.length) return { success: false, speech: "Note not found." };
  const deleted = notes.splice(i, 1)[0];
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
  return { success: true, speech: `Deleted note: "${deleted.text}"` };
}

async function clearNotes() {
  await fs.writeFile(NOTES_FILE, JSON.stringify([]));
  return { success: true, speech: "All notes cleared, sir." };
}

module.exports = { addNote, listNotes, deleteNote, clearNotes };