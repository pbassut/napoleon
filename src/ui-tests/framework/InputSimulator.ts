import { ProcessManager } from './ProcessManager';

export class InputSimulator {
  constructor(private processManager: ProcessManager) {}

  async pressKey(pid: number, key: string): Promise<void> {
    const keyMapping: Record<string, string> = {
      enter: '\r',
      return: '\r',
      tab: '\t',
      space: ' ',
      escape: '\x1b',
      esc: '\x1b',
      up: '\x1b[A',
      down: '\x1b[B',
      right: '\x1b[C',
      left: '\x1b[D',
      backspace: '\x7f',
      delete: '\x1b[3~',
      home: '\x1b[H',
      end: '\x1b[F',
      pageup: '\x1b[5~',
      pagedown: '\x1b[6~',
    };

    const input = keyMapping[key.toLowerCase()] || key;
    await this.processManager.sendInput(pid, input);
  }

  async typeText(pid: number, text: string, delayBetweenChars: number = 10): Promise<void> {
    for (const char of text) {
      await this.processManager.sendInput(pid, char);
      if (delayBetweenChars > 0) {
        await this.delay(delayBetweenChars);
      }
    }
  }

  async sendKeySequence(pid: number, keys: string[], delayBetweenKeys: number = 100): Promise<void> {
    for (const key of keys) {
      await this.pressKey(pid, key);
      if (delayBetweenKeys > 0) {
        await this.delay(delayBetweenKeys);
      }
    }
  }

  async sendCtrlKey(pid: number, key: string): Promise<void> {
    // Convert key to control character
    const charCode = key.toUpperCase().charCodeAt(0);
    if (charCode >= 65 && charCode <= 90) {
      const ctrlChar = String.fromCharCode(charCode - 64);
      await this.processManager.sendInput(pid, ctrlChar);
    } else {
      throw new Error(`Invalid control key: ${key}`);
    }
  }

  async sendAltKey(pid: number, key: string): Promise<void> {
    // ESC followed by the key simulates Alt+key in most terminals
    await this.processManager.sendInput(pid, `\x1b${key}`);
  }

  async clearInput(pid: number): Promise<void> {
    // Send Ctrl+U to clear current line
    await this.sendCtrlKey(pid, 'u');
  }

  async confirmDialog(pid: number): Promise<void> {
    await this.pressKey(pid, 'enter');
  }

  async cancelDialog(pid: number): Promise<void> {
    await this.pressKey(pid, 'escape');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
