// server/commands/music.js
// Music playback using mpv player with playlist management, pause/resume, and real-time state
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

const MUSIC_FOLDER = "C:\\Users\\parsa\\Downloads\\Tony stark playlist";
const DADS_MUSIC_FOLDER = "C:\\Users\\parsa\\Downloads\\Dads playlist";

let currentPlayer = null;
let isPlaying = false;
let currentPlaylistSongs = [];
let currentIndex = 0;
let currentFolder = MUSIC_FOLDER;
let nextSongTimeout = null;
let pausedRemainingMs = 0;
let pausedElapsedMs = 0;
let pauseStartTime = null;
let songStartTime = null;       
let totalSongDurationMs = 0;    
let musicSocket = null;
let elapsedInterval = null;
let onMusicStateChange = null;  // ONLY DECLARE ONCE

function setMusicStateCallback(callback) {
  onMusicStateChange = callback;
}

function emitMusicState() {
  if (!musicSocket) return;
  
  if (currentPlaylistSongs.length === 0) {
    musicSocket.emit("musicState", { playing: false, paused: false });
    return;
  }
  
  const song = currentPlaylistSongs[currentIndex];
  const duration = getRealDurationSeconds(song, currentFolder);
  
  let elapsed;
  if (!isPlaying && pausedElapsedMs > 0) {
    elapsed = Math.floor(pausedElapsedMs / 1000);
  } else if (songStartTime) {
    elapsed = Math.floor((Date.now() - songStartTime) / 1000);
  } else {
    elapsed = 0;
  }
  
  const remaining = isPlaying 
    ? Math.max(0, duration - elapsed) 
    : Math.max(0, duration - elapsed);
  
  musicSocket.emit("musicState", {
    playing: true,
    paused: !isPlaying,
    song: song,
    folder: currentFolder === DADS_MUSIC_FOLDER ? "dads" : "tony",
    duration: duration,
    elapsed: Math.max(0, elapsed),
    remaining: remaining,
    queuePosition: currentIndex + 1,
    queueTotal: currentPlaylistSongs.length,
  });
}

function startElapsedTimer() {
  if (elapsedInterval) clearInterval(elapsedInterval);
  
  elapsedInterval = setInterval(() => {
    if (!musicSocket) return;
    if (currentPlaylistSongs.length === 0) return;
    emitMusicState();
  }, 1000);
}

// Shuffle an array (Fisher-Yates)
function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get all MP3 files in a folder
function getSongs(folder) {
  try {
    const files = fs.readdirSync(folder);
    return files.filter(f => f.toLowerCase().endsWith('.mp3'));
  } catch (err) {
    logger.error(`Failed to read music folder: ${err.message}`);
    return [];
  }
}

// Search for a song by name in a specific folder
function searchSong(query, folder) {
  const songs = getSongs(folder);
  const queryLower = query.toLowerCase();
  
  let match = songs.find(s => s.toLowerCase().includes(queryLower));
  
  if (!match) {
    const words = queryLower.split(' ');
    match = songs.find(s => words.every(w => s.toLowerCase().includes(w)));
  }
  
  return match;
}

// Read REAL MP3 duration from file metadata (ID3 tags + bitrate calculation)
function getRealDurationSeconds(songFile, folder) {
  try {
    const useFolder = folder || currentFolder;
    const songPath = path.join(useFolder, songFile);
    const buffer = fs.readFileSync(songPath);
    
    let dataStart = 0;
    let tlenduration = 0;
    
    // Check for ID3v2 header
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      const majorVersion = buffer[3];
      const flags = buffer[5];
      let id3Size = ((buffer[6] & 0x7F) << 21) | ((buffer[7] & 0x7F) << 14) | ((buffer[8] & 0x7F) << 7) | (buffer[9] & 0x7F);
      
      if (flags & 0x10) id3Size += 10;
      
      dataStart = 10 + id3Size;
      
      let offset = 10;
      while (offset < dataStart - 10 && offset + 10 <= buffer.length) {
        const frameId = buffer.toString('ascii', offset, offset + 4);
        
        if (frameId === 'TLEN') {
          let frameSize;
          if (majorVersion >= 4) {
            frameSize = ((buffer[offset + 4] & 0xFF) << 24) | ((buffer[offset + 5] & 0xFF) << 16) | ((buffer[offset + 6] & 0xFF) << 8) | (buffer[offset + 7] & 0xFF);
          } else {
            frameSize = ((buffer[offset + 4] & 0xFF) << 24) | ((buffer[offset + 5] & 0xFF) << 16) | ((buffer[offset + 6] & 0xFF) << 8) | (buffer[offset + 7] & 0xFF);
          }
          
          if (frameSize > 0 && offset + 10 + frameSize <= buffer.length) {
            const tlenStr = buffer.toString('ascii', offset + 10, offset + 10 + frameSize).replace(/\0/g, '').trim();
            const tlenMs = parseInt(tlenStr);
            if (tlenMs > 0 && tlenMs < 7200000) {
              tlenduration = tlenMs / 1000;
            }
          }
          break;
        }
        
        let frameSize;
        if (majorVersion >= 4) {
          frameSize = ((buffer[offset + 4] & 0xFF) << 24) | ((buffer[offset + 5] & 0xFF) << 16) | ((buffer[offset + 6] & 0xFF) << 8) | (buffer[offset + 7] & 0xFF);
        } else {
          frameSize = ((buffer[offset + 4] & 0xFF) << 24) | ((buffer[offset + 5] & 0xFF) << 16) | ((buffer[offset + 6] & 0xFF) << 8) | (buffer[offset + 7] & 0xFF);
        }
        
        if (frameSize <= 0 || frameSize > 1000000) break;
        offset += 10 + frameSize;
      }
      
      if (tlenduration > 0) {
        return Math.round(tlenduration);
      }
    }
    
    // No TLEN frame found, calculate from bitrate
    for (let i = dataStart; i < buffer.length - 4 && i < dataStart + 10000; i++) {
      if (buffer[i] === 0xFF && (buffer[i + 1] & 0xE0) === 0xE0) {
        const bitrateIndex = (buffer[i + 2] & 0xF0) >> 4;
        const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
        const bitrate = bitrateTable[bitrateIndex] || 128;
        
        if (bitrate > 0) {
          const audioDataSize = buffer.length - i;
          const durationSeconds = (audioDataSize * 8) / (bitrate * 1000);
          return Math.round(durationSeconds);
        }
        break;
      }
    }
    
    const seconds = (buffer.length / 1024) / 24;
    return Math.max(120, Math.min(Math.round(seconds), 420));
    
  } catch (e) {
    logger.error(`Failed to read duration: ${e.message}`);
    return 180;
  }
}

// Play next song in queue
async function playNextInQueue() {
  if (currentPlaylistSongs.length === 0) return;
  
  currentIndex++;
  
  if (currentIndex >= currentPlaylistSongs.length) {
    currentPlaylistSongs = shuffleArray(getSongs(currentFolder));
    currentIndex = 0;
  }
  
  if (currentPlaylistSongs.length > 0) {
    await playSong(currentPlaylistSongs[currentIndex], currentFolder);
  }
}

// Schedule the next song timer
function scheduleNextSong(durationMs) {
  if (nextSongTimeout) {
    clearTimeout(nextSongTimeout);
    nextSongTimeout = null;
  }
  
  songStartTime = Date.now();
  totalSongDurationMs = durationMs;
  pausedRemainingMs = 0;
  pausedElapsedMs = 0;
  pauseStartTime = null;
  
  nextSongTimeout = setTimeout(async () => {
    logger.log("Song finished, playing next...");
    await playNextInQueue();
  }, durationMs);
}

// Play a specific song file
const MPV_PATH = "C:\\Users\\parsa\\Downloads\\mpv.player.0.33.0.x86_YasDL.com\\mpv.exe";

function playSong(songFile, folder) {
  return new Promise(async (resolve) => {
    // Stop current music and WAIT for it to fully stop
    await stopMusic(false);
    
    // Add a small delay to ensure the process is fully killed
    await new Promise(r => setTimeout(r, 500));
    
    const useFolder = folder || currentFolder;
    const songPath = path.join(useFolder, songFile);
    
    let command;
    
    if (fs.existsSync(MPV_PATH)) {
      command = `"${MPV_PATH}" --no-video --force-window=no --no-terminal --really-quiet "${songPath}"`;
    } else {
      command = `powershell -c "Add-Type -AssemblyName PresentationCore; $mediaPlayer = New-Object System.Windows.Media.MediaPlayer; $mediaPlayer.Open('${songPath}'); $mediaPlayer.Play(); Start-Sleep -Seconds ${getRealDurationSeconds(songFile, useFolder) + 2}"`;
    }
    
    console.log(`Executing command: ${command}`);
    
    currentPlayer = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Playback error: ${error.message}`);
        if (!error.message.includes('SIGTERM') && !error.message.includes('killed')) {
          logger.error(`Playback error: ${error.message}`);
        }
      }
      if (stderr) {
        console.error(`MPV stderr: ${stderr}`);
      }
    });
    
    const durationSeconds = getRealDurationSeconds(songFile, useFolder);
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    logger.log(`Playing: ${songFile} [${mins}:${String(secs).padStart(2, '0')}]`);
    
    scheduleNextSong((durationSeconds + 2) * 1000);
    
    isPlaying = true;

    // Notify that music started playing
    if (onMusicStateChange) onMusicStateChange(true);

    startElapsedTimer();
    emitMusicState();

    resolve({ speech: `Playing ${songFile.replace('.mp3', '')}` });
  });
}

// Play Tony Stark playlist
async function playPlaylist() {
  currentFolder = MUSIC_FOLDER;
  const songs = getSongs(MUSIC_FOLDER);
  
  if (songs.length === 0) {
    return { speech: "No songs found in the Tony Stark playlist folder." };
  }
  
  currentPlaylistSongs = shuffleArray(songs);
  currentIndex = 0;
  
  return await playSong(currentPlaylistSongs[0], MUSIC_FOLDER);
}

// Play dad's playlist
async function playDadsPlaylist() {
  currentFolder = DADS_MUSIC_FOLDER;
  const songs = getSongs(DADS_MUSIC_FOLDER);
  
  if (songs.length === 0) {
    return { speech: "No songs found in dad's playlist folder." };
  }
  
  currentPlaylistSongs = shuffleArray(songs);
  currentIndex = 0;
  
  return await playSong(currentPlaylistSongs[0], DADS_MUSIC_FOLDER);
}

// Manual skip to next song
async function nextSong() {
  if (nextSongTimeout) {
    clearTimeout(nextSongTimeout);
    nextSongTimeout = null;
  }
  pausedRemainingMs = 0;
  pausedElapsedMs = 0;
  pauseStartTime = null;
  
  if (currentPlaylistSongs.length === 0) {
    currentPlaylistSongs = shuffleArray(getSongs(currentFolder));
  }
  
  if (currentPlaylistSongs.length === 0) {
    return { speech: "No songs in the playlist." };
  }
  
  currentIndex++;
  if (currentIndex >= currentPlaylistSongs.length) {
    currentPlaylistSongs = shuffleArray(getSongs(currentFolder));
    currentIndex = 0;
  }
  
  return await playSong(currentPlaylistSongs[currentIndex], currentFolder);
}

// Previous song
async function previousSong() {
  if (nextSongTimeout) {
    clearTimeout(nextSongTimeout);
    nextSongTimeout = null;
  }
  pausedRemainingMs = 0;
  pausedElapsedMs = 0;
  pauseStartTime = null;
  
  if (currentPlaylistSongs.length === 0) {
    currentPlaylistSongs = shuffleArray(getSongs(currentFolder));
  }
  
  if (currentPlaylistSongs.length === 0) {
    return { speech: "No songs in the playlist." };
  }
  
  currentIndex--;
  if (currentIndex < 0) {
    currentIndex = currentPlaylistSongs.length - 1;
  }
  
  return await playSong(currentPlaylistSongs[currentIndex], currentFolder);
}

// Pause/resume - Kills and restarts mpv from correct position
function togglePause() {
  return new Promise(async (resolve) => {
    if (isPlaying) {
      // PAUSING
      if (nextSongTimeout && songStartTime) {
        const elapsed = Date.now() - songStartTime;
        pausedRemainingMs = totalSongDurationMs - elapsed;
        if (pausedRemainingMs < 0) pausedRemainingMs = 0;
        
        // Save the elapsed time at pause moment
        pausedElapsedMs = elapsed;
        
        clearTimeout(nextSongTimeout);
        nextSongTimeout = null;
      }
      
      // Kill the mpv process
      if (currentPlayer) {
        try {
          exec('taskkill /F /IM mpv.exe 2>nul', () => {});
          if (currentPlayer.pid) {
            try {
              process.kill(currentPlayer.pid, 'SIGTERM');
            } catch (e) {}
          }
        } catch (e) {}
        currentPlayer = null;
      }
      
      isPlaying = false;
      emitMusicState();
      resolve({ speech: "Paused" });
    } else {
      // RESUMING - Restart mpv from saved position
      if (pausedRemainingMs > 0 && currentPlaylistSongs.length > 0) {
        const songFile = currentPlaylistSongs[currentIndex];
        const songPath = path.join(currentFolder, songFile);
        const totalSeconds = getRealDurationSeconds(songFile, currentFolder);
        const startPosition = totalSeconds - (pausedRemainingMs / 1000);
        
        // Start mpv from the paused position
        const command = `"${MPV_PATH}" --no-video --force-window=no --no-terminal --really-quiet --start=${Math.floor(startPosition)} "${songPath}"`;
        
        console.log(`Resuming from position ${Math.floor(startPosition)}s: ${command}`);
        
        // Adjust songStartTime to account for the already elapsed time
        songStartTime = Date.now() - pausedElapsedMs;
        isPlaying = true;
        
        currentPlayer = exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`Playback error on resume: ${error.message}`);
            if (!error.message.includes('SIGTERM') && !error.message.includes('killed')) {
              logger.error(`Playback error: ${error.message}`);
            }
          }
        });
        
        nextSongTimeout = setTimeout(async () => {
          logger.log("Song finished after resume, playing next...");
          await playNextInQueue();
        }, pausedRemainingMs);
        
        pausedRemainingMs = 0;
        pausedElapsedMs = 0;
        startElapsedTimer();
      } else {
        // No song to resume, just set playing to true
        isPlaying = true;
      }
      
      // Emit state AFTER setting songStartTime
      emitMusicState();
      resolve({ speech: "Resumed" });
    }
  });
}

// Stop music
async function stopMusic(clearTimer = true) {
  if (clearTimer && nextSongTimeout) {
    clearTimeout(nextSongTimeout);
    nextSongTimeout = null;
  }
  pausedRemainingMs = 0;
  pausedElapsedMs = 0;
  pauseStartTime = null;
  
  if (elapsedInterval) {
    clearInterval(elapsedInterval);
    elapsedInterval = null;
  }
  
  if (currentPlayer) {
    try {
      await new Promise((resolve) => {
        exec('taskkill /F /IM mpv.exe 2>nul', () => {
          setTimeout(resolve, 300);
        });
      });
      
      exec('taskkill /F /IM wmplayer.exe 2>nul', () => {});
      exec('taskkill /F /IM Music.UI.exe 2>nul', () => {});
      
      if (currentPlayer && currentPlayer.pid) {
        try {
          process.kill(currentPlayer.pid, 'SIGTERM');
        } catch (e) {}
      }
    } catch (e) {
      console.error('Error killing process:', e);
    }
    currentPlayer = null;
  }
  isPlaying = false;

  // Notify that music stopped
  if (onMusicStateChange) onMusicStateChange(false);
  
  if (clearTimer && musicSocket) {
    musicSocket.emit("musicState", { playing: false, paused: false });
  }
}

// Set socket for frontend communication
function setMusicSocket(socket) {
  musicSocket = socket;
}

// Search and play
async function searchAndPlay(query, specificFolder) {
  let song;
  let folder;
  
  if (specificFolder === 'dads') {
    folder = DADS_MUSIC_FOLDER;
    song = searchSong(query, DADS_MUSIC_FOLDER);
    if (!song) return { speech: `Couldn't find "${query}" in dad's playlist.` };
  } else if (specificFolder === 'tony') {
    folder = MUSIC_FOLDER;
    song = searchSong(query, MUSIC_FOLDER);
    if (!song) return { speech: `Couldn't find "${query}" in Tony's playlist.` };
  } else {
    song = searchSong(query, MUSIC_FOLDER);
    folder = MUSIC_FOLDER;
    if (!song) {
      song = searchSong(query, DADS_MUSIC_FOLDER);
      folder = DADS_MUSIC_FOLDER;
    }
    if (!song) return { speech: `Couldn't find "${query}" in either playlist.` };
  }
  
  currentFolder = folder;
  const allSongs = getSongs(folder);
  const otherSongs = allSongs.filter(s => s !== song);
  currentPlaylistSongs = [song, ...shuffleArray(otherSongs)];
  currentIndex = 0;
  
  return await playSong(song, folder);
}

// List songs
function listSongs() {
  const folderName = currentFolder === DADS_MUSIC_FOLDER ? "Dad's playlist" : "Tony Stark playlist";
  const songs = getSongs(currentFolder);
  
  if (songs.length === 0) {
    return { speech: `No songs found in ${folderName}.` };
  }
  
  const songNames = songs.map(s => s.replace('.mp3', ''));
  return { speech: `${folderName}: ${songs.length} songs` };
}

// Module exports
module.exports = {
  searchAndPlay,
  playPlaylist,
  playDadsPlaylist,
  nextSong,
  previousSong,
  togglePause,
  stopMusic,
  listSongs,
  setMusicSocket,
  setMusicStateCallback
};