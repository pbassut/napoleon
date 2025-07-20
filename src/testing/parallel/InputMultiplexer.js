/**
 * Input Multiplexer for Parallel UI Testing
 * Synchronizes input between multiple UI processes
 */

const EventEmitter = require('events');

class InputMultiplexer extends EventEmitter {
  constructor(processes = []) {
    super();
    
    this.processes = processes;
    this.inputHistory = [];
    this.recording = false;
    this.recordingBuffer = [];
  }

  /**
   * Add a process to multiplex inputs to
   */
  addProcess(process, name) {
    this.processes.push({ process, name });
  }

  /**
   * Remove a process from multiplexing
   */
  removeProcess(name) {
    this.processes = this.processes.filter(p => p.name !== name);
  }

  /**
   * Send input to all processes
   */
  async send(input) {
    const timestamp = Date.now();
    const normalizedInput = this.normalizeInput(input);
    
    // Record input
    const inputRecord = {
      ...normalizedInput,
      timestamp,
      sent: false,
      errors: []
    };
    
    this.inputHistory.push(inputRecord);
    
    if (this.recording) {
      this.recordingBuffer.push(inputRecord);
    }
    
    // Send to all processes in parallel
    const promises = this.processes.map(({ process, name }) => 
      this.sendToProcess(process, name, normalizedInput)
        .catch(error => {
          inputRecord.errors.push({ process: name, error: error.message });
          throw error;
        })
    );
    
    try {
      await Promise.all(promises);
      inputRecord.sent = true;
      this.emit('input-sent', inputRecord);
    } catch (error) {
      this.emit('input-error', { input: inputRecord, error });
    }
    
    // Wait after input if specified
    if (normalizedInput.waitAfter) {
      await this.delay(normalizedInput.waitAfter);
    }
  }

  /**
   * Send input to a specific process
   */
  async sendToProcess(process, name, input) {
    return new Promise((resolve, reject) => {
      if (!process || process.killed || !process.stdin) {
        reject(new Error(`Process ${name} not available`));
        return;
      }

      const data = this.inputToData(input);
      
      try {
        process.stdin.write(data, (err) => {
          if (err) {
            reject(new Error(`Failed to write to ${name}: ${err.message}`));
          } else {
            this.emit('input-sent-to-process', { name, input, data });
            resolve();
          }
        });
      } catch (error) {
        reject(new Error(`Exception writing to ${name}: ${error.message}`));
      }
    });
  }

  /**
   * Normalize input format
   */
  normalizeInput(input) {
    if (typeof input === 'string') {
      return {
        type: 'text',
        text: input,
        waitAfter: 100
      };
    }
    
    return {
      type: input.key ? 'key' : 'text',
      waitAfter: 100,
      ...input
    };
  }

  /**
   * Convert input object to data string
   */
  inputToData(input) {
    if (input.type === 'text') {
      return input.text;
    }
    
    // Handle key input
    let data = '';
    
    switch (input.key) {
      // Arrow keys
      case 'up':
      case 'ArrowUp':
        data = '\x1b[A';
        break;
      case 'down':
      case 'ArrowDown':
        data = '\x1b[B';
        break;
      case 'left':
      case 'ArrowLeft':
        data = '\x1b[D';
        break;
      case 'right':
      case 'ArrowRight':
        data = '\x1b[C';
        break;
        
      // Special keys
      case 'enter':
      case 'return':
        data = '\r';
        break;
      case 'escape':
      case 'esc':
        data = '\x1b';
        break;
      case 'tab':
        data = '\t';
        break;
      case 'backspace':
        data = '\x7f';
        break;
      case 'delete':
        data = '\x1b[3~';
        break;
      case 'home':
        data = '\x1b[H';
        break;
      case 'end':
        data = '\x1b[F';
        break;
      case 'pageup':
        data = '\x1b[5~';
        break;
      case 'pagedown':
        data = '\x1b[6~';
        break;
        
      // Function keys
      case 'f1': data = '\x1bOP'; break;
      case 'f2': data = '\x1bOQ'; break;
      case 'f3': data = '\x1bOR'; break;
      case 'f4': data = '\x1bOS'; break;
      case 'f5': data = '\x1b[15~'; break;
      case 'f6': data = '\x1b[17~'; break;
      case 'f7': data = '\x1b[18~'; break;
      case 'f8': data = '\x1b[19~'; break;
      case 'f9': data = '\x1b[20~'; break;
      case 'f10': data = '\x1b[21~'; break;
      case 'f11': data = '\x1b[23~'; break;
      case 'f12': data = '\x1b[24~'; break;
        
      default:
        // Single character
        if (input.key.length === 1) {
          data = input.key;
        } else {
          console.warn(`Unknown key: ${input.key}`);
          data = '';
        }
    }
    
    // Apply modifiers
    if (data && input.ctrl && data.length === 1) {
      // Ctrl + letter produces ASCII 1-26
      const charCode = data.toUpperCase().charCodeAt(0);
      if (charCode >= 65 && charCode <= 90) {
        data = String.fromCharCode(charCode - 64);
      }
    }
    
    if (data && input.meta) {
      data = '\x1b' + data;
    }
    
    if (data && input.shift && data.length === 1) {
      // Shift is usually handled by using uppercase
      data = data.toUpperCase();
    }
    
    return data;
  }

  /**
   * Send a sequence of inputs
   */
  async sendSequence(sequence) {
    for (const input of sequence) {
      await this.send(input);
      
      // Allow interruption
      if (this.interrupted) {
        break;
      }
    }
  }

  /**
   * Start recording inputs
   */
  startRecording() {
    this.recording = true;
    this.recordingBuffer = [];
  }

  /**
   * Stop recording and return recorded inputs
   */
  stopRecording() {
    this.recording = false;
    const recorded = [...this.recordingBuffer];
    this.recordingBuffer = [];
    return recorded;
  }

  /**
   * Replay recorded inputs
   */
  async replay(inputs, options = {}) {
    const timeScale = options.timeScale || 1;
    const maintainTiming = options.maintainTiming !== false;
    
    let lastTimestamp = null;
    
    for (const input of inputs) {
      if (maintainTiming && lastTimestamp !== null) {
        const delay = (input.timestamp - lastTimestamp) * timeScale;
        if (delay > 0) {
          await this.delay(delay);
        }
      }
      
      lastTimestamp = input.timestamp;
      
      // Send the input without the timestamp
      const { timestamp, ...inputData } = input;
      await this.send(inputData);
    }
  }

  /**
   * Get input history
   */
  getHistory() {
    return [...this.inputHistory];
  }

  /**
   * Clear input history
   */
  clearHistory() {
    this.inputHistory = [];
  }

  /**
   * Interrupt ongoing operations
   */
  interrupt() {
    this.interrupted = true;
  }

  /**
   * Reset interrupt flag
   */
  resetInterrupt() {
    this.interrupted = false;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { InputMultiplexer };