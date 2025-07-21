export class OutputParser {
  private ansiEscapeRegex = /\x1b\[[0-9;]*m/g;
  private cursorMovementRegex = /\x1b\[[0-9]*[A-Z]/g;
  private clearLineRegex = /\x1b\[2K/g;

  stripAnsiCodes(text: string): string {
    return text
      .replace(this.ansiEscapeRegex, '')
      .replace(this.cursorMovementRegex, '')
      .replace(this.clearLineRegex, '')
      .replace(/\x1b\[[\?]?[0-9;]*[a-zA-Z]/g, '');
  }

  findInOutput(output: string, pattern: string | RegExp): boolean {
    const cleanOutput = this.stripAnsiCodes(output);
    if (typeof pattern === 'string') {
      return cleanOutput.includes(pattern);
    }
    return pattern.test(cleanOutput);
  }

  extractLines(output: string): string[] {
    const cleanOutput = this.stripAnsiCodes(output);
    return cleanOutput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  extractAgentList(output: string): Array<{id: string, prompt: string, status: string}> {
    const lines = this.extractLines(output);
    const agents: Array<{id: string, prompt: string, status: string}> = [];
    
    // Look for agent entries in the format: "[id] prompt (status)" with optional prefix
    const agentRegex = /(?:▶\s+|  )?\[(\d+)\]\s+(.+?)\s*\((\w+)\)$/;
    
    for (const line of lines) {
      const match = line.match(agentRegex);
      if (match) {
        agents.push({
          id: match[1],
          prompt: match[2],
          status: match[3]
        });
      }
    }
    
    return agents;
  }

  extractDialogContent(output: string): string | null {
    const lines = this.extractLines(output);
    
    // Look for dialog boundaries
    let inDialog = false;
    let dialogContent: string[] = [];
    
    for (const line of lines) {
      if (line.includes('┌─') || line.includes('╭─')) {
        inDialog = true;
        dialogContent.push(line);
        continue;
      }
      if (line.includes('└─') || line.includes('╰─')) {
        if (inDialog) {
          dialogContent.push(line);
        }
        inDialog = false;
        break;
      }
      if (inDialog) {
        dialogContent.push(line);
      }
    }
    
    return dialogContent.length > 0 ? dialogContent.join('\n') : null;
  }

  findSelectedItem(output: string): string | null {
    const lines = this.extractLines(output);
    
    // Look for lines with selection indicators like ▶, >, or highlighted
    for (const line of lines) {
      if (line.startsWith('▶')) {
        return line.trim();
      }
    }
    
    return null;
  }

  extractErrorMessage(output: string): string | null {
    const lines = this.extractLines(output);
    
    // Look for error indicators
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('error') || 
          line.toLowerCase().includes('failed') ||
          line.includes('❌') ||
          line.includes('✗')) {
        // Return this line and potentially the next few lines
        const errorLines = [line];
        for (let j = 1; j <= 2 && i + j < lines.length; j++) {
          errorLines.push(lines[i + j]);
        }
        return errorLines.join('\n');
      }
    }
    
    return null;
  }

  hasScrollIndicator(output: string, position: 'top' | 'bottom'): boolean {
    const lines = this.extractLines(output);
    
    if (position === 'top') {
      return lines.some(line => line === '↑' || line.includes('▲'));
    } else {
      return lines.some(line => line === '↓' || line.includes('▼'));
    }
  }

  getLastPrompt(output: string): string | null {
    const lines = this.extractLines(output);
    
    // Look for common prompt indicators
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes('$') || line.includes('>') || line.includes('❯')) {
        return line;
      }
    }
    
    return null;
  }

  extractProgressIndicator(output: string): string | null {
    const lines = this.extractLines(output);
    
    // Look for loading/progress indicators
    for (const line of lines) {
      if (line.includes('⠋') || line.includes('⠙') || line.includes('⠹') ||
          line.includes('⠸') || line.includes('⠼') || line.includes('⠴') ||
          line.includes('⠦') || line.includes('⠧') || line.includes('⠇') ||
          line.includes('⠏') || line.includes('...') || line.includes('•••')) {
        return line;
      }
    }
    
    return null;
  }
}