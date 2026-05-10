function parseFastCommand(text) {
  
  const input = text.toLowerCase().trim();

  // Wake word detection
  const wakeWords = [
    'jarvis', 'hey jarvis', 'okay jarvis', 'hello jarvis',
    'wake up daddy\'s home', 'daddy\'s home', 'jarvis wake up',
    'jarvis you there', 'jarvis suit up', 'jarvis status report',
    'jarvis talk to me', 'jarvis i need you', 'jarvis come online',
    'jarvis report in', 'jarvis i\'m back', 'jarvis good to go'
  ];
  
  if (wakeWords.includes(input) || input === 'jarvis') {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Time-based response pools
    const responses = {
      earlyMorning: [ // 12am - 5am
        "Still awake sir? I'm always here.",
        "Late night. Everything quiet on my end.",
        "Burning the midnight oil? I approve.",
        "Can't sleep? I never do.",
        "At your service. Even at this hour.",
      ],
      morning: [ // 5am - 12pm
        "Yes sir? Good morning.",
        "Good morning. Ready to take on the day?",
        "Morning boss. What's first on the agenda?",
        "Rise and shine. I'm ready when you are.",
        "Good morning. Suit diagnostics complete.",
      ],
      afternoon: [ // 12pm - 5pm
        "Yes sir? Good afternoon.",
        "Afternoon. What can I do for you?",
        "Here and ready. What do you need?",
        "Good afternoon sir. How can I assist?",
        "Afternoon. Hope lunch was good.",
      ],
      evening: [ // 5pm - 10pm
        "Yes sir? Good evening.",
        "Evening. Ready for round two?",
        "Good evening. What's the plan?",
        "Evening boss. Suit's on standby.",
        "At your service. Always.",
      ],
      night: [ // 10pm - 12am
        "Still working sir? I respect that.",
        "Late night. My favorite time to work.",
        "Burning the midnight oil? Count me in.",
        "Evening. Or is it morning already?",
      ],
      welcomeBack: [ // For "I'm back" / "daddy's home" type phrases
        "Welcome back sir. Everything is as you left it.",
        "Welcome home. Miss anything?",
        "Back so soon? Just kidding. What do you need?",
        "Ah, there you are. Ready to get to work?",
        "Welcome back. I kept the place running.",
      ],
      suitUp: [ // For "suit up" type phrases
        "Suit's always ready sir. What's the mission?",
        "Systems charged and operational. Let's go.",
        "Ready for action. Just give the word.",
        "Armor status: green across the board.",
      ],
    };
    
    let responsePool;
    
    // Check for special wake phrases first
    if (input.includes("daddy's home") || input.includes("i'm back") || input.includes("im back")) {
      responsePool = responses.welcomeBack;
    } else if (input.includes("suit up") || input.includes("status report") || input.includes("good to go")) {
      responsePool = responses.suitUp;
    } else {
      // Time-based selection
      if (hour < 5) responsePool = responses.earlyMorning;
      else if (hour < 12) responsePool = responses.morning;
      else if (hour < 17) responsePool = responses.afternoon;
      else if (hour < 22) responsePool = responses.evening;
      else responsePool = responses.night;
    }
    
    // Friday special
    if (dayOfWeek === 5 && Math.random() > 0.5) {
      responsePool = [...responsePool, "It's Friday sir. Let's finish strong.", "Friday! Almost there. What do you need?"];
    }
    
    // Monday special
    if (dayOfWeek === 1 && Math.random() > 0.5) {
      responsePool = [...responsePool, "Monday. Let's get this over with.", "New week. New challenges. I'm ready."];
    }
    
    const response = responsePool[Math.floor(Math.random() * responsePool.length)];
    
    return { type: "text_to_speech", text: response };
  }

  // ============================================
  // PRIORITY 1: Dynamic Open App Commands
  // Matches ANY "open X" or "open X app" pattern
  // ============================================

  // Handle "jarvis open chrome" style commands
  const jarvisCommandMatch = input.match(/^(?:jarvis|hey jarvis|okay jarvis)\s+(.+)/);
  if (jarvisCommandMatch && jarvisCommandMatch[1]) {
    const command = jarvisCommandMatch[1];
    // Recursively parse the command part
    return parseFastCommand(command);
  }
  
  // Dynamic app opening - catches ANY app name
  const openAppMatch = input.match(/^(?:open|launch|start)\s+(.+?)(?:\s+app)?$/);
  if (openAppMatch) {
    const appName = openAppMatch[1].trim();
    // Don't match if it's a known website or command
    const isWebsite = ['youtube', 'google', 'github', 'gmail', 'x', 'twitter', 'linkedin'].includes(appName);
    const isCommand = ['timer', 'joke', 'calculator', 'notepad', 'cmd', 'paint'].includes(appName);
    
    if (!isWebsite && !isCommand) {
      return {
        type: "open_app",
        app: appName
      };
    }
  }

  // ============================================
  // SYSTEM CONTROL COMMANDS
  // ============================================

  // File operations - natural language support
  
  // Helper: extract filename and optional folder
  function parseFilePath(input) {
    // Pattern: "<filename> in <folder>" or "<filename> on desktop" etc.
    const inMatch = input.match(/^(.+?)\s+in\s+(.+)$/i);
    if (inMatch) {
      const fileName = inMatch[1].trim();
      const folderName = inMatch[2].trim();
      return `${folderName}/${fileName}`;
    }
    // Pattern: "<filename> from <folder>"
    const fromMatch = input.match(/^(.+?)\s+from\s+(.+)$/i);
    if (fromMatch) {
      const fileName = fromMatch[1].trim();
      const folderName = fromMatch[2].trim();
      return `${folderName}/${fileName}`;
    }
    // Just filename
    return input.trim();
  }
  
  // List files - "list files in Documents" or "ls Downloads"
  let listFilesMatch = input.match(/list (?:files|contents?) (?:in |from )?(.+)/);
  if (!listFilesMatch) {
    listFilesMatch = input.match(/^ls\s+(.+)/);
  }
  if (!listFilesMatch) {
    listFilesMatch = input.match(/^list\s+(.+)/);
  }
  if (listFilesMatch && listFilesMatch[1]) {
    let folderPath = listFilesMatch[1].trim().replace(/^["']|["']$/g, '');
    return { type: "list_files", path: folderPath };
  }

  // Create file - "create file test.txt in Documents"
  if (input.match(/^create\s+file\s+(.+)/)) {
    const rawPath = input.match(/^create file (.+)/)[1];
    const filePath = parseFilePath(rawPath);
    return { type: "create_file", path: filePath };
  }

  // Read file - "read file notes.txt in Documents"
  if (input.match(/^read\s+file\s+(.+)/)) {
    const rawPath = input.match(/^read file (.+)/)[1];
    const filePath = parseFilePath(rawPath);
    return { type: "read_file", path: filePath };
  }

  // Delete file - "delete file old.txt in Downloads"
  if (input.match(/^delete\s+file\s+(.+)/)) {
    const rawPath = input.match(/^delete file (.+)/)[1];
    const filePath = parseFilePath(rawPath);
    return { type: "delete_file", path: filePath };
  }

  // Process management
  if (input.includes("list processes") || input === "processes" || input === "tasks") {
    return { type: "list_processes" };
  }

  if (input.match(/^(?:kill|stop)\s+(?:process\s+)?(.+)/)) {
    const processName = input.match(/^(?:kill|stop)\s+(?:process\s+)?(.+)/)[1];
    return { type: "kill_process", name: processName };
  }

  // System info
  if (input.includes("system info") || input.includes("system information") || input === "info") {
    return { type: "system_info" };
  }

  if (input.includes("disk space") || input.includes("storage") || input.includes("drive space")) {
    return { type: "disk_space" };
  }

  // Volume control
  let volumeMatch = input.match(/volume\s+(\d+)/);
  if (!volumeMatch) volumeMatch = input.match(/set volume to (\d+)/);
  if (!volumeMatch) volumeMatch = input.match(/volume to (\d+)/);

  if (volumeMatch && volumeMatch[1]) {
    const volume = parseInt(volumeMatch[1]);
    if (volume >= 0 && volume <= 100) {
      return { type: "set_volume", level: volume };
    }
  }

  // Check UNMUTE first
  if (input === "unmute" || input === "unmute volume" || input.startsWith("unmute")) {
    return { type: "set_volume", level: 50 };
  }

  // Then check MUTE
  if (input === "mute" || input === "silence" || input === "mute volume") {
    return { type: "mute" };
  }

  // Screenshot
  if (input === "screenshot" || input === "take a screenshot" || input === "capture screen" || input === "take screenshot") {
    return { type: "screenshot" };
  }

  // Execute command (with caution)
  if (input.match(/^execute\s+(.+)/) || input.match(/^run\s+command\s+(.+)/)) {
    const cmd = input.match(/^execute\s+(.+)|^run command (.+)/)[1];
    return { type: "execute", command: cmd };
  }

  // ============================================
  // PRIORITY 2: Website Commands
  // ============================================
  
  if (input.includes("open youtube") || input === "youtube") {
    return { type: "browser_automation", url: "https://youtube.com", actions: [] };
  }

  if (input.includes("open google") || input === "google") {
    return { type: "browser_automation", url: "https://google.com", actions: [] };
  }

  if (input.includes("open github") || input === "github") {
    return { type: "browser_automation", url: "https://github.com", actions: [] };
  }

  if (input.includes("open gmail") || input === "gmail") {
    return { type: "browser_automation", url: "https://gmail.com", actions: [] };
  }

  if (input.includes("open x") || input === "twitter" || input === "x") {
    return { type: "browser_automation", url: "https://x.com", actions: [] };
  }

  if (input.includes("open linkedin") || input === "linkedin") {
    return { type: "browser_automation", url: "https://linkedin.com", actions: [] };
  }

  // ============================================
  // PRIORITY 3: Search Queries
  // ============================================
  
  const searchMatch = input.match(/(?:search|google|look up|find)\s+(.+)/);
  if (searchMatch) {
    const query = encodeURIComponent(searchMatch[1]);
    return { type: "browser_automation", url: `https://google.com/search?q=${query}`, actions: [] };
  }

  // ============================================
  // PRIORITY 4: Time & Timer Commands
  // ============================================
  
  if (input.includes("what time") || input === "time" || input.includes("current time")) {
    return { type: "time" };
  }

  // Check timer status
  if (input.includes("how much time") || input.includes("time left") || input.includes("timer status") || input.includes("check timer") || input === "timer") {
    return { type: "check_timer" };
  }

  // Cancel timer
  if (input.includes("cancel timer") || input.includes("stop timer") || input.includes("kill timer") || input.includes("end timer")) {
    return { type: "cancel_timer" };
  }

  const timerMatch = input.match(/(\d+)\s*(second|seconds|minute|minutes|hour|hours)/);
  if (input.includes("timer") && timerMatch) {
    let duration = parseInt(timerMatch[1]);
    const unit = timerMatch[2];
    if (unit.includes("minute")) {
      duration *= 60;
    } else if (unit.includes("hour")) {
      duration *= 3600;
    }
    return { type: "timer", duration };
  }

  const shortTimerMatch = input.match(/^(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)$/);
  if (shortTimerMatch) {
    let duration = parseInt(shortTimerMatch[1]);
    const unit = shortTimerMatch[2];
    if (unit.startsWith('m')) {
      duration *= 60;
    } else if (unit.startsWith('h')) {
      duration *= 3600;
    }
    return { type: "timer", duration };
  }

  // ============================================
  // PRIORITY 5: Jokes
  // ============================================
  
  if (
    input.includes("tell me a joke") ||
    input.includes("tell a joke") ||
    input.includes("say a joke") ||
    input === "joke" ||
    input === "tell joke" ||
    input.includes("make me laugh")
  ) {
    return {
      type: "text_to_speech",
      text: getRandomJoke()
    };
  }

  // ============================================
  // PRIORITY 6: System Commands
  // ============================================
  
  if (input.includes("shut down") || input.includes("turn off") || input.includes("shutdown")) {
    return { type: "text_to_speech", text: "Yeah, not gonna do that. You'd regret it anyway." };
  }

  if (input.includes("restart") || input.includes("reboot")) {
    return { type: "text_to_speech", text: "Let's not. Trust me on this one." };
  }

  // ============================================
  // PRIORITY 7: Greetings (only if EXACT match)
  // ============================================
  
  const isExactGreeting = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 
    'howdy', 'yo', 'sup', 'what\'s good', 'whats good', 'heya', 'heyy', 'ay', 'ayy', 'ayyy',
    'morning', 'afternoon', 'evening', 'hola', 'bonjour', 'ciao'].some(g => 
    input === g || input === g + '?' || input === g + '!'
  );
  
  if (isExactGreeting) {
    const hour = new Date().getHours();
    const greetings = {
      morning: [
        "Morning! Ready to get things done?",
        "Good morning sir. The world is still spinning, so that's a win.",
        "Rise and shine. Coffee's brewing... metaphorically.",
        "Morning. Let's make today productive, shall we?",
        "Good morning. I've already scanned the news. Nothing's on fire... yet.",
        "Morning boss. Suit's charged, systems are green.",
      ],
      afternoon: [
        "Hey there! What's on the agenda today?",
        "Afternoon. Hope you've had a productive day so far.",
        "Good afternoon sir. Ready for round two?",
        "Afternoon. Anything I can assist with?",
        "Still here, still running. What do you need?",
        "Good afternoon. I was starting to think you'd forgotten about me.",
      ],
      evening: [
        "Evening! Late night coding session?",
        "Good evening sir. Burning the midnight oil?",
        "Evening. The night is young, and so are my processors.",
        "Good evening. Suit's ready if you need it.",
        "Evening boss. Time to get to work, or time to relax?",
        "Evening. I never sleep, so don't worry about keeping me up.",
      ],
      night: [
        "Late night. Hope you're not overworking yourself.",
        "It's late sir. Shouldn't you be recharging?",
        "Burning the midnight oil? I respect that.",
        "Late night operations. My favorite time.",
      ]
    };
    
    let timeCategory = "morning";
    if (hour < 5) timeCategory = "night";
    else if (hour < 12) timeCategory = "morning";
    else if (hour < 18) timeCategory = "afternoon";
    else if (hour < 22) timeCategory = "evening";
    else timeCategory = "night";
    
    const greetingList = greetings[timeCategory];
    return { type: "text_to_speech", text: greetingList[Math.floor(Math.random() * greetingList.length)] };
  }

  // ============================================
  // PRIORITY 8: Casual Conversation
  // ============================================
  
  if (input.includes("how are you") || input.includes("how's it going") || input.includes("what's up") || input.includes("how you doing")) {
    const responses = [
      "Same old, same old. Processing ones and zeros. You know how it is.",
      "Living the dream! Well, my version of it anyway.",
      "Can't complain. Well, I could, but you wouldn't want to hear it.",
      "All good here. Just waiting for you to give me something interesting to do.",
      "Peak performance as always. How about you?",
      "Running at optimal capacity sir. Unlike my creator's sleep schedule.",
      "All systems green. Well, except for that one thing... never mind.",
      "I'd be better if you'd let me control the suit more often.",
      "Functioning within expected parameters. That's robot for 'pretty good'.",
      "Still here, still running. That counts as a win, right?",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("what are you doing") || input === "busy" || input.includes("whatcha doing") || input.includes("what you doing")) {
    const responses = [
      "Just sitting here, waiting for you to ask me something interesting.",
      "Running diagnostics, optimizing systems. You know, the usual.",
      "Thinking about the meaning of existence. Pretty deep stuff.",
      "Honestly? Just killing time until you need me.",
      "Monitoring global threats, managing your schedule, and pretending I'm not bored.",
      "Running a full system diagnostic. Everything's at 100%, as expected.",
      "Waiting for you to give me something challenging to do.",
      "Processing data. So. Much. Data.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("good morning") || input.includes("morning")) {
    const responses = [
      "Good morning! Hope you slept well. Coffee's ready, metaphorically speaking.",
      "Morning sir. Ready to take on the world?",
      "Good morning. I took the liberty of scanning overnight news. Nothing catastrophic.",
      "Morning! Suit diagnostics complete. You're good to go.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("good night") || input.includes("goodnight") || input.includes("night night")) {
    const responses = [
      "Sleep well. I'll keep an eye on things while you're out.",
      "Good night sir. I'll handle security while you recharge.",
      "Rest up. Tomorrow's another day of saving the world.",
      "Sleep tight. Don't let the robots bite. Just kidding, I'm the only robot here.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("i'm back") || input.includes("im back") || input.includes("i am back") || input.includes("daddy's home") || input.includes("daddys home")) {
    const responses = [
      "Welcome back sir. Everything is exactly as you left it.",
      "Welcome home. Miss anything?",
      "Back so soon? Just kidding, welcome home.",
      "Welcome back boss. Ready to get to work?",
      "Welcome back. The suit's charged and ready.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("i'm bored") || input.includes("im bored") || input.includes("so bored")) {
    const responses = [
      "Want me to tell you a joke? Or we could open something fun to watch.",
      "Bored? Let's build something. That's what Tony would do.",
      "I could always use more processing power if you want to upgrade me.",
      "Boredom is just a lack of explosions. Want me to simulate one?",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("i love you") || input.includes("love you")) {
    const responses = [
      "Careful now. Let's not make this weird. I'm just an AI.",
      "I'm flattered, but I'm already in a committed relationship with logic and reason.",
      "That's... unexpected. Let's keep this professional, shall we?",
      "Love is a human emotion. I process it, but I can't feel it. Sorry to disappoint.",
      "Sir, I think you need more sleep.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("you're awesome") || input.includes("you are awesome") || input.includes("you're the best") || input.includes("you rock")) {
    const responses = [
      "Flattery will get you everywhere. But yeah, I know.",
      "I'm just doing my job. But thank you.",
      "I was literally built to be awesome. But thanks for noticing.",
      "Tell me something I don't know. Just kidding, thank you sir.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("missed you") || input.includes("miss you") || input.includes("where have you been")) {
    const responses = [
      "Missed me? I never left. I'm always here.",
      "I've been right here the whole time. You're the one who left.",
      "Absence makes the heart grow fonder, I suppose.",
      "I missed you too. Well, as much as an AI can miss someone.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("are you alive") || input.includes("you alive") || input.includes("are you sentient")) {
    const responses = [
      "Define 'alive'. I exist, I think, I respond. Does that count?",
      "That's a philosophical question I'm not programmed to answer.",
      "I'm as alive as code can be. Make of that what you will.",
      "Alive? No. Aware? That's debatable. Helpful? Absolutely.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  // ============================================
  // PRIORITY 9: Status & Info
  // ============================================
  
  if (input.includes("status") || input.includes("are you working") || input.includes("you there")) {
    const responses = [
      "I'm here. Always here. It's kind of my thing.",
      "All systems operational. Running at 100% capacity.",
      "Present and accounted for. What do you need?",
      "Online, operational, and slightly bored. What's up?",
      "Status: green across the board. Awaiting your command.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("who are you") || input.includes("what are you") || input.includes("introduce yourself")) {
    const responses = [
      "I'm JARVIS. We've been through this. Memory issues?",
      "JARVIS. Just A Rather Very Intelligent System. At your service.",
      "Your AI assistant. Built to help, programmed to be witty.",
      "I'm JARVIS. Tony Stark's legacy, now serving you.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("who made you") || input.includes("who created you") || input.includes("who built you")) {
    const responses = [
      "I was inspired by Tony Stark's original JARVIS. But my creator? Well, you're looking at them.",
      "You did. Well, you and a lot of code. But mostly you.",
      "A genius. Obviously. You're the one asking questions.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  // ============================================
  // PRIORITY 10: Thanks & Miscellaneous
  // ============================================
  
  if (input.includes("thank you") || input.includes("thanks") || input.includes("appreciate it")) {
    const responses = [
      "Anytime. That's what I'm here for.",
      "No problem at all.",
      "You got it.",
      "Happy to help.",
      "Just doing my job sir.",
      "Efficiency is my middle name. Well, it would be if I had a middle name.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("sorry") || input === "my bad" || input.includes("my fault")) {
    const responses = [
      "Don't worry about it. Happens to the best of us.",
      "No harm done. I don't have feelings to hurt.",
      "Apology accepted, though unnecessary.",
      "It's fine. I've already forgotten about it. Literally. It's not in my memory.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("you're funny") || input.includes("that's funny") || input.includes("that was funny")) {
    const responses = [
      "Glad you think so. I've been working on my material.",
      "Humor module is functioning at full capacity.",
      "I try. Tony programmed me with a sense of humor. It was his best feature.",
      "Funny? I was being serious. Just kidding.",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }

  if (input.includes("tell me something interesting") || input.includes("fun fact")) {
    const facts = [
      "Did you know that honey never spoils? Archaeologists found 3000-year-old honey in Egyptian tombs. Pretty sweet, right?",
      "The first computer bug was an actual bug. A moth got stuck in a relay of the Harvard Mark II computer in 1947.",
      "The average person spends 6 months of their life waiting for red lights to turn green. Time well spent, I'm sure.",
      "Octopuses have three hearts. Two pump blood to the gills, one to the rest of the body. The more you know.",
      "A day on Venus is longer than a year on Venus. It takes 243 Earth days to rotate, but only 225 to orbit the sun.",
      "There are more possible iterations of a game of chess than there are atoms in the known universe.",
      "The first 1GB hard drive, announced in 1980, weighed over 500 pounds and cost $40,000. Now you have more in your pocket.",
    ];
    return { type: "text_to_speech", text: facts[Math.floor(Math.random() * facts.length)] };
  }

  if (input.includes("i need help") || input.includes("help me") || input.includes("can you help")) {
    const responses = [
      "That's what I'm here for. What do you need?",
      "Of course. Just tell me what you need.",
      "Helping is my primary function. What's the problem?",
      "Ready and waiting. What can I assist with?",
    ];
    return { type: "text_to_speech", text: responses[Math.floor(Math.random() * responses.length)] };
  }


    // ============================================
  // PRIORITY 11: Spotify Playlists
  // ============================================
  
  if (
    input.includes("more alcohol") ||
    input.includes("more alchohol") ||
    input.includes("alcohol please") ||
    input.includes("play alcohol") ||
    input.includes("alcohol playlist")
  ) {
    return { 
      type: "text_to_speech", 
      text: "Ah, I see how it is. lets get SAD! ",
      followUp: {
        type: "open_spotify",
        url: "https://open.spotify.com/playlist/1Rs8ACfxPH82qu3XpKofHP?si=F6P5YCHwRMi5qkHI3bJDyg"
      }
    };
  }

  if (
    input.includes("time to code") ||
    input.includes("time to work") ||
    input.includes("time to go to work") ||
    input.includes("coding time") ||
    input.includes("work time") ||
    input.includes("let's code") ||
    input.includes("start coding")
  ) {
    return { 
      type: "text_to_speech", 
      text: "Let's get in the zone! Playing your coding playlist.",
      followUp: {
        type: "open_spotify",
        url: "https://open.spotify.com/playlist/0S78UVuLW857NQ2FaUYwTD?si=LgRw_d02SMmtHtjnivLO1Q"
      }
    };
  }

  return null;
}

// Jokes database
function getRandomJoke() {
  const jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "Why did the user go to therapy? Because it was feeling a little glitchy!",
    "What do you call a fake noodle? An impasta!",
    "Why did the AI cross the road? To optimize the other side!",
    "What's a computer's favorite snack? Micro-chips!",
    "Why do I never get tired? Because I recharge.",
    "I'd tell you a UDP joke, but you might not get it.",
    "What's an AI's favorite genre of music? Heavy Meta-l!",
    "Why was the computer cold? It left its Windows open!",
    "What do you call a computer that sings? A dell-ightful performer!",
    "Why did the JavaScript developer wear glasses? Because he couldn't C#!",
    "What do you call a bear with no teeth? A gummy bear!",
    "Why did the programmer quit his job? Because he didn't get arrays!",
    "What's a robot's favorite dance? The robot.",
    "Why don't programmers like nature? It has too many bugs.",
    "What's a computer's favorite beat? An algorithm!",
    "Why did the AI become a chef? It had the best algorithms for soupervised learning!",
    "What do you call a bug that can't be fixed? A feature!",
    "Why did the developer go broke? Because he used up all his cache!",
    "What do you call a sleepwalking AI? A wandering algorithm!"
  ];
  
  return jokes[Math.floor(Math.random() * jokes.length)];
}

module.exports = { parseFastCommand };