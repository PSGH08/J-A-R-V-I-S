const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');

let lastWakeTime = Date.now();

function getCPUUsage() {
  return new Promise((resolve) => {
    const startMeasure = os.cpus();
    const startIdle = startMeasure.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const startTotal = startMeasure.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);

    setTimeout(() => {
      const endMeasure = os.cpus();
      const endIdle = endMeasure.reduce((acc, cpu) => acc + cpu.times.idle, 0);
      const endTotal = endMeasure.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);

      const idle = endIdle - startIdle;
      const total = endTotal - startTotal;
      const percent = Math.round((1 - idle / total) * 1000) / 10;

      resolve(percent);
    }, 1000);
  });
}

function getCPUTemp() {
  return new Promise((resolve) => {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Try multiple methods
      exec('powershell "Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace root/wmi | Select-Object -First 1 | ForEach-Object { $_.CurrentTemperature }"', { timeout: 3000 }, (error, stdout) => {
        if (!error && stdout.trim()) {
          const kelvin = parseFloat(stdout.trim()) / 10;
          const celsius = Math.round(kelvin - 273.15);
          if (celsius > 0 && celsius < 120) {
            resolve(celsius);
            return;
          }
        }
        // Fallback - try nvidia-smi for CPU temp approximation
        exec('nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader', { timeout: 3000 }, (err2, out2) => {
          if (!err2 && out2.trim()) {
            resolve(parseInt(out2.trim()) - 5); // GPU temp minus ~5 for CPU estimate
          } else {
            resolve(null);
          }
        });
      });
    } else {
      // existing code for mac/linux...
      resolve(null);
    }
  });
}

function getDiskSpace() {
  return new Promise((resolve) => {
    const platform = process.platform;
    
    if (platform === 'win32') {
      exec('powershell "Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -gt 0 } | ForEach-Object { $_.Name + \'|\' + [math]::Round($_.Free/1GB,1) + \'|\' + [math]::Round(($_.Used + $_.Free)/1GB,1) }"', { timeout: 5000 }, (error, stdout) => {
        console.log('Disk PSDrive output:', stdout);
        console.log('Disk PSDrive error:', error);
        
        if (!error && stdout.trim()) {
          const drives = {};
          const lines = stdout.trim().split('\n').filter(l => l.trim());
          lines.forEach(line => {
            const parts = line.split('|');
            if (parts.length >= 3) {
              const letter = parts[0].trim();
              const free = parseFloat(parts[1]);
              const total = parseFloat(parts[2]);
              if (letter && !isNaN(free) && !isNaN(total)) {
                drives[letter] = { free: Math.round(free), total: Math.round(total), used: Math.round(total - free) };
              }
            }
          });
          console.log('Parsed drives:', drives);
          resolve(drives);
        } else {
          resolve({});
        }
      });
    } else {
      // existing Linux/Mac code...
      resolve({});
    }
  });
}

function getBattery() {
  return new Promise((resolve) => {
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      command = 'powershell "(Get-WmiObject Win32_Battery).EstimatedChargeRemaining"';
    } else if (platform === 'darwin') {
      command = 'pmset -g batt | grep -o "[0-9]*%" | tr -d "%"';
    } else {
      command = 'upower -i /org/freedesktop/UPower/devices/battery_BAT0 2>/dev/null | grep percentage | awk \'{print $2}\' | tr -d "%"';
    }

    exec(command, { timeout: 3000 }, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve(null);
        return;
      }
      const percent = parseInt(stdout.trim());
      resolve(isNaN(percent) ? null : percent);
    });
  });
}

function getNetworkInfo() {
  return new Promise((resolve) => {
    exec('ping -n 1 8.8.8.8', { timeout: 3000 }, (error, stdout) => {
      let ping = null;
      if (!error && stdout) {
        const match = stdout.match(/time[=<]\s*(\d+)ms/i);
        if (match) ping = parseInt(match[1]);
      }
      
      // Get active connections count
      const platform = process.platform;
      const cmd = platform === 'win32' ? 'netstat -an | find /c "ESTABLISHED"' : 'netstat -an | grep ESTABLISHED | wc -l';
      
      exec(cmd, { timeout: 3000 }, (err2, out2) => {
        const connections = out2 ? parseInt(out2.trim()) || 0 : 0;
        
        // Get total processes
        const procCmd = platform === 'win32' ? 'powershell "(Get-Process).Count"' : 'ps aux | wc -l';
        
        exec(procCmd, { timeout: 3000 }, (err3, out3) => {
          const totalProcs = out3 ? parseInt(out3.trim()) || 0 : 0;
          resolve({ ping, connections, totalProcesses: totalProcs });
        });
      });
    });
  });
}

function getMemoryInfo() {
  // Get memory type/speed (Windows only via WMI)
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('powershell "(Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1).Speed"', { timeout: 3000 }, (error, stdout) => {
        const speed = stdout ? parseInt(stdout.trim()) : null;
        resolve(speed ? `${speed}MHz` : null);
      });
    } else if (process.platform === 'darwin') {
      exec('system_profiler SPMemoryDataType | grep "Speed:" | head -1 | awk \'{print $2" "$3}\'', { timeout: 3000 }, (error, stdout) => {
        resolve(stdout ? stdout.trim() : null);
      });
    } else {
      exec('sudo dmidecode -t memory 2>/dev/null | grep "Speed:" | head -1 | awk \'{print $2" "$3}\'', { timeout: 3000 }, (error, stdout) => {
        resolve(stdout ? stdout.trim() : null);
      });
    }
  });
}

function getTopProcesses() {
  return new Promise((resolve) => {
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      command = 'powershell "Get-Process | Group-Object ProcessName | ForEach-Object { $_.Name + \'|\' + [math]::Round(($_.Group | Measure-Object CPU -Sum).Sum, 1) + \'|\' + [math]::Round(($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1GB, 2) + \'|\' + $_.Count } | Sort-Object { [double]($_ -split \'\\|\')[1] } -Descending | Select-Object -First 10"';
    } else if (platform === 'darwin') {
      command = 'ps -eo comm,pcpu,rss -r | awk \'{cpu[$1]+=$2; ram[$1]+=$3; count[$1]++} END {for (p in cpu) printf "%s|%.1f|%.2f|%d\\n", p, cpu[p], ram[p]/1024/1024, count[p]}\' | sort -t\'|\' -k2 -rn | head -10';
    } else {
      command = 'ps -eo comm,pcpu,rss --sort=-pcpu | awk \'{cpu[$1]+=$2; ram[$1]+=$3; count[$1]++} END {for (p in cpu) printf "%s|%.1f|%.2f|%d\\n", p, cpu[p], ram[p]/1024/1024, count[p]}\' | sort -t\'|\' -k2 -rn | head -10';
    }

    exec(command, { timeout: 3000 }, (error, stdout) => {
      if (error) {
        resolve([{ name: "System", cpu: 0.8, ram: 1.2, count: 1 }]);
        return;
      }

      const lines = stdout.trim().split('\n').filter(l => l.trim());
      const tasks = lines.map(line => {
        const parts = line.split('|');
        const name = parts[0] || 'unknown';
        const cpu = parseFloat(parts[1]) || 0;
        const ram = parseFloat(parts[2]) || 0;
        const count = parseInt(parts[3]) || 1;
        return { name: count > 1 ? `${name} (${count})` : name, cpu, ram };
      });

      resolve(tasks.length > 0 ? tasks : [{ name: "System", cpu: 0.8, ram: 1.2 }]);
    });
  });
}

function getGPUInfo() {
  return new Promise((resolve) => {
    exec('nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,power.draw --format=csv,noheader', { timeout: 5000 }, (error, stdout) => {
      if (!error && stdout.trim()) {
        const parts = stdout.trim().split(',');
        const temp = parseInt(parts[0]);
        const usage = parseInt(parts[1]);
        const power = parts[2] ? parts[2].trim() : null;
        resolve({ temp: isNaN(temp) ? null : temp, usage: isNaN(usage) ? null : usage, power });
        return;
      }

      if (process.platform === 'win32') {
        exec('powershell "(Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature | Select-Object -First 1).CurrentTemperature"', { timeout: 3000 }, (err2, out2) => {
          if (!err2 && out2.trim()) {
            const raw = parseFloat(out2.trim());
            const temp = raw > 200 ? Math.round(raw - 273.15) : Math.round(raw);
            resolve({ temp: isNaN(temp) ? null : temp, usage: null, power: null });
          } else {
            resolve({ temp: null, usage: null, power: null });
          }
        });
      } else {
        resolve({ temp: null, usage: null, power: null });
      }
    });
  });
}

function setWakeTime() {
  lastWakeTime = Date.now();
}

function getLastWake() {
  const diff = Date.now() - lastWakeTime;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  return `${minutes}m ago`;
}

async function getSystemStats() {
  const cpuPercent = await getCPUUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramPercent = Math.round((usedMem / totalMem) * 1000) / 10;
  
  const [gpuInfo, diskSpace, battery, networkInfo, memorySpeed, cpuTemp] = await Promise.all([
    getGPUInfo(), getDiskSpace(), getBattery(), getNetworkInfo(), getMemoryInfo(), getCPUTemp()
  ]);
  const tasks = await getTopProcesses();

  return {
    cpu: { percent: cpuPercent, cores: os.cpus().length, temp: cpuTemp },
    ram: { percent: ramPercent, used: Math.round(usedMem / 1024 / 1024 / 1024 * 10) / 10, total: Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10, speed: memorySpeed },
    gpu: { percent: gpuInfo.usage, temp: gpuInfo.temp, power: gpuInfo.power },
    disk: diskSpace,
    battery,
    network: networkInfo,
    tasks: tasks.slice(0, 10),
    uptime: os.uptime(),
    lastWake: getLastWake(),
    platform: process.platform,
    hostname: os.hostname(),
  };
}

module.exports = { getSystemStats, setWakeTime };