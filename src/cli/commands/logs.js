const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');
const AgentLogManager = require('../../core/logging/agent-log-manager');
const logger = require('../../utils/logger');

class LogsCommand {
  constructor(config) {
    this.config = config;
    this.agentLogManager = new AgentLogManager(config);
    this.logsDir = path.join(config.napoleonDir, 'logs', 'agents');
  }

  async initialize() {
    if (!this.agentLogManager.isInitialized()) {
      await this.agentLogManager.initialize();
    }
  }

  async listLogs(options = {}) {
    await this.initialize();

    try {
      if (!fs.existsSync(this.logsDir)) {
        if (options.format === 'json') {
          console.log(JSON.stringify({ logs: [] }));
        } else {
          console.log(chalk.yellow('No logs directory found. No agent logs have been created yet.'));
        }
        return;
      }

      const files = await fs.promises.readdir(this.logsDir);
      const logFiles = files.filter((file) => file.endsWith('.log'));

      if (logFiles.length === 0) {
        if (options.format === 'json') {
          console.log(JSON.stringify({ logs: [] }));
        } else {
          console.log(chalk.yellow('No agent logs found.'));
        }
        return;
      }

      const logInfos = await Promise.all(
        logFiles.map(async (filename) => {
          const filePath = path.join(this.logsDir, filename);
          const stats = await fs.promises.stat(filePath);

          const parts = filename.replace('.log', '').split('_');
          const date = parts[0];
          const agentId = parts[1];
          const prompt = parts.slice(2).join('_');

          return {
            date,
            agentId,
            prompt,
            filename,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            modifiedRelative: LogsCommand.getRelativeTime(stats.mtime),
          };
        }),
      );

      logInfos.sort((a, b) => new Date(b.modified) - new Date(a.modified));

      const limitedLogs = options.limit ? logInfos.slice(0, options.limit) : logInfos;

      if (options.format === 'json') {
        console.log(JSON.stringify({ logs: limitedLogs }, null, 2));
      } else {
        LogsCommand.displayLogsTable(limitedLogs);
      }
    } catch (error) {
      logger.error('Failed to list logs', { error: error.message });
      throw new Error(`Failed to list logs: ${error.message}`);
    }
  }

  async viewLog(identifier, options = {}) {
    await this.initialize();

    try {
      const logPath = await this.resolveLogFile(identifier);
      if (!logPath) {
        throw new Error(`Log not found: ${identifier}`);
      }

      if (options.follow) {
        LogsCommand.followLog(logPath);
        return;
      }

      let content;
      if (options.tail) {
        content = await LogsCommand.tailLog(logPath, options.tail);
      } else {
        content = await fs.promises.readFile(logPath, 'utf8');
      }

      if (options.raw) {
        console.log(content);
      } else {
        LogsCommand.displayFormattedLog(content);
      }
    } catch (error) {
      logger.error('Failed to view log', { identifier, error: error.message });
      throw new Error(`Failed to view log: ${error.message}`);
    }
  }

  async searchLogs(term, options = {}) {
    await this.initialize();

    try {
      if (!fs.existsSync(this.logsDir)) {
        console.log(chalk.yellow('No logs directory found.'));
        return;
      }

      const files = await fs.promises.readdir(this.logsDir);
      const logFiles = files.filter((file) => file.endsWith('.log'));

      if (logFiles.length === 0) {
        console.log(chalk.yellow('No agent logs found.'));
        return;
      }

      const results = [];
      const searchRegex = new RegExp(term, 'gi');

      await Promise.all(logFiles.map(async (filename) => {
        const filePath = path.join(this.logsDir, filename);

        if (options.from || options.to) {
          const fileDate = LogsCommand.extractDateFromFilename(filename);
          if (!LogsCommand.isDateInRange(fileDate, options.from, options.to)) {
            return;
          }
        }

        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (searchRegex.test(line)) {
            const contextStart = Math.max(0, index - (options.context || 2));
            const contextEnd = Math.min(lines.length - 1, index + (options.context || 2));

            results.push({
              filename,
              lineNumber: index + 1,
              line: LogsCommand.highlightSearchTerm(line, term),
              context: lines.slice(contextStart, contextEnd + 1)
                .map((l, i) => ({
                  lineNumber: contextStart + i + 1,
                  content: contextStart + i === index 
                    ? LogsCommand.highlightSearchTerm(l, term) 
                    : l,
                  isMatch: contextStart + i === index,
                })),
            });
          }
        });
      }));

      if (results.length === 0) {
        console.log(chalk.yellow(`No matches found for "${term}"`));
      } else {
        LogsCommand.displaySearchResults(results, term);
      }
    } catch (error) {
      logger.error('Failed to search logs', { term, error: error.message });
      throw new Error(`Failed to search logs: ${error.message}`);
    }
  }

  async searchByPrompt(keyword, options = {}) {
    await this.initialize();

    try {
      if (!fs.existsSync(this.logsDir)) {
        console.log(chalk.yellow('No logs directory found.'));
        return;
      }

      const files = await fs.promises.readdir(this.logsDir);
      const logFiles = files.filter((file) => file.endsWith('.log'));

      if (logFiles.length === 0) {
        console.log(chalk.yellow('No agent logs found.'));
        return;
      }

      const matches = logFiles
        .filter((filename) => {
          const prompt = LogsCommand.extractPromptFromFilename(filename);
          return prompt.toLowerCase().includes(keyword.toLowerCase());
        })
        .map((filename) => {
          const parts = filename.replace('.log', '').split('_');
          return {
            date: parts[0],
            agentId: parts[1],
            prompt: parts.slice(2).join('_'),
            filename,
          };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      const limitedMatches = options.limit ? matches.slice(0, options.limit) : matches;

      if (limitedMatches.length === 0) {
        console.log(chalk.yellow(`No logs found with prompt keyword "${keyword}"`));
      } else {
        console.log(chalk.green(`Found ${limitedMatches.length} logs matching "${keyword}":\n`));
        LogsCommand.displayLogsTable(limitedMatches);
      }
    } catch (error) {
      logger.error('Failed to search by prompt', { keyword, error: error.message });
      throw new Error(`Failed to search by prompt: ${error.message}`);
    }
  }

  async resolveLogFile(identifier) {
    const files = await fs.promises.readdir(this.logsDir);
    const logFiles = files.filter((file) => file.endsWith('.log'));

    let match = logFiles.find((file) => file === identifier || file === `${identifier}.log`);

    if (!match) {
      match = logFiles.find((file) => {
        const prompt = LogsCommand.extractPromptFromFilename(file);
        return prompt.includes(identifier.toLowerCase());
      });
    }

    return match ? path.join(this.logsDir, match) : null;
  }

  static async tailLog(logPath, numLines) {
    const content = await fs.promises.readFile(logPath, 'utf8');
    const lines = content.split('\n');
    const startIndex = Math.max(0, lines.length - numLines - 1);
    return lines.slice(startIndex).join('\n');
  }

  static followLog(logPath) {
    const tail = spawn('tail', ['-f', logPath], { stdio: 'inherit' });

    process.on('SIGINT', () => {
      tail.kill();
      process.exit(0);
    });

    tail.on('error', (error) => {
      console.error(chalk.red(`Error following log: ${error.message}`));
      process.exit(1);
    });
  }

  static displayLogsTable(logs) {
    console.log(chalk.bold('Date        Agent ID   Prompt                          Size     Modified'));
    console.log(chalk.gray('─'.repeat(80)));

    logs.forEach((log) => {
      const size = LogsCommand.formatFileSize(log.size);
      const prompt = log.prompt.length > 30 ? `${log.prompt.substring(0, 27)}...` : log.prompt;

      console.log(
        `${chalk.cyan(log.date)} ${chalk.yellow(log.agentId.padEnd(10))} ${prompt.padEnd(30)} ${size.padEnd(8)} ${chalk.gray(log.modifiedRelative)}`,
      );
    });
  }

  static displayFormattedLog(content) {
    const lines = content.split('\n');

    lines.forEach((line) => {
      if (!line.trim()) return;

      try {
        const entry = JSON.parse(line);
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const typeColor = LogsCommand.getTypeColor(entry.type);

        console.log(`${chalk.gray(timestamp)} ${typeColor(entry.type.toUpperCase().padEnd(8))} ${entry.content}`);

        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
          console.log(chalk.gray(`  ${JSON.stringify(entry.metadata)}`));
        }
      } catch (error) {
        console.log(chalk.gray(line));
      }
    });
  }

  static displaySearchResults(results, term) {
    console.log(chalk.green(`Found ${results.length} matches for "${term}":\n`));

    results.forEach((result, index) => {
      if (index > 0) console.log('');

      console.log(chalk.cyan(`${result.filename}:${result.lineNumber}`));

      result.context.forEach((ctx) => {
        const prefix = ctx.isMatch ? chalk.red('▶') : ' ';
        const lineNum = chalk.gray(`${ctx.lineNumber}:`);
        console.log(`${prefix} ${lineNum} ${ctx.content}`);
      });
    });
  }

  static highlightSearchTerm(text, term) {
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, chalk.bgYellow.black('$1'));
  }

  static getTypeColor(type) {
    const colors = {
      system: chalk.blue,
      sdk_request: chalk.green,
      sdk_response: chalk.cyan,
      sdk_error: chalk.red,
      error: chalk.red,
      info: chalk.white,
    };
    return colors[type] || chalk.white;
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))}${sizes[i]}`;
  }

  static getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  static extractDateFromFilename(filename) {
    return filename.split('_')[0];
  }

  static extractPromptFromFilename(filename) {
    const parts = filename.replace('.log', '').split('_');
    return parts.slice(2).join('_');
  }

  static isDateInRange(fileDate, fromDate, toDate) {
    const date = new Date(fileDate);
    if (fromDate && date < new Date(fromDate)) return false;
    if (toDate && date > new Date(toDate)) return false;
    return true;
  }
}

module.exports = LogsCommand;
