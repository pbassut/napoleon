/**
 * Output Comparator for Parallel UI Testing
 * Compares terminal output between Blessed and Ink UIs
 */

const stripAnsi = require('strip-ansi');
const diff = require('diff');

class OutputComparator {
  constructor(options = {}) {
    this.options = {
      ignoreTimingDifferences: options.ignoreTimingDifferences !== false,
      ignoreCursorPosition: options.ignoreCursorPosition !== false,
      ignoreAnsiCodes: options.ignoreAnsiCodes || false,
      frameAlignment: options.frameAlignment || 'timestamp', // 'timestamp' or 'sequence'
      timingTolerance: options.timingTolerance || 200, // ms
      ...options
    };
    
    this.blessedFrames = [];
    this.inkFrames = [];
    this.comparisonResults = [];
  }

  /**
   * Capture output frame from a UI
   */
  captureFrame(ui, frame) {
    const normalizedFrame = this.normalizeFrame(frame);
    
    if (ui === 'blessed') {
      this.blessedFrames.push(normalizedFrame);
    } else if (ui === 'ink') {
      this.inkFrames.push(normalizedFrame);
    }
  }

  /**
   * Normalize frame data
   */
  normalizeFrame(frame) {
    return {
      timestamp: frame.timestamp || Date.now(),
      content: frame.data || frame.content || '',
      type: frame.type || 'stdout',
      cursor: frame.cursor || null,
      metadata: frame.metadata || {}
    };
  }

  /**
   * Compare all captured frames
   */
  compare() {
    const alignedFrames = this.alignFrames();
    const differences = [];
    let totalFrames = 0;
    let matchingFrames = 0;
    
    for (const { blessed, ink, alignment } of alignedFrames) {
      totalFrames++;
      
      const comparison = this.compareFrames(blessed, ink);
      
      if (comparison.matches) {
        matchingFrames++;
      } else {
        differences.push({
          frameIndex: totalFrames - 1,
          blessed,
          ink,
          alignment,
          ...comparison
        });
      }
    }
    
    const matchPercentage = totalFrames > 0 
      ? (matchingFrames / totalFrames) * 100 
      : 100;
    
    return {
      totalFrames,
      matchingFrames,
      differences: differences.length,
      matchPercentage,
      details: differences,
      summary: this.generateSummary(differences)
    };
  }

  /**
   * Align frames between blessed and ink
   */
  alignFrames() {
    const aligned = [];
    
    if (this.options.frameAlignment === 'sequence') {
      // Simple sequence-based alignment
      const maxLength = Math.max(this.blessedFrames.length, this.inkFrames.length);
      
      for (let i = 0; i < maxLength; i++) {
        aligned.push({
          blessed: this.blessedFrames[i] || null,
          ink: this.inkFrames[i] || null,
          alignment: 'sequence'
        });
      }
    } else {
      // Timestamp-based alignment with tolerance
      let bIndex = 0;
      let iIndex = 0;
      
      while (bIndex < this.blessedFrames.length || iIndex < this.inkFrames.length) {
        const bFrame = this.blessedFrames[bIndex];
        const iFrame = this.inkFrames[iIndex];
        
        if (!bFrame) {
          aligned.push({ blessed: null, ink: iFrame, alignment: 'ink-only' });
          iIndex++;
        } else if (!iFrame) {
          aligned.push({ blessed: bFrame, ink: null, alignment: 'blessed-only' });
          bIndex++;
        } else {
          const timeDiff = Math.abs(bFrame.timestamp - iFrame.timestamp);
          
          if (timeDiff <= this.options.timingTolerance) {
            aligned.push({ blessed: bFrame, ink: iFrame, alignment: 'matched' });
            bIndex++;
            iIndex++;
          } else if (bFrame.timestamp < iFrame.timestamp) {
            aligned.push({ blessed: bFrame, ink: null, alignment: 'blessed-early' });
            bIndex++;
          } else {
            aligned.push({ blessed: null, ink: iFrame, alignment: 'ink-early' });
            iIndex++;
          }
        }
      }
    }
    
    return aligned;
  }

  /**
   * Compare two frames
   */
  compareFrames(blessedFrame, inkFrame) {
    if (!blessedFrame || !inkFrame) {
      return {
        matches: false,
        type: 'missing-frame',
        details: { 
          blessed: !!blessedFrame, 
          ink: !!inkFrame 
        }
      };
    }
    
    // Compare content
    let blessedContent = blessedFrame.content;
    let inkContent = inkFrame.content;
    
    if (this.options.ignoreAnsiCodes) {
      blessedContent = stripAnsi(blessedContent);
      inkContent = stripAnsi(inkContent);
    }
    
    if (blessedContent === inkContent) {
      return { matches: true };
    }
    
    // Detailed comparison
    const contentDiff = this.compareContent(blessedContent, inkContent);
    const cursorDiff = this.compareCursors(blessedFrame.cursor, inkFrame.cursor);
    
    return {
      matches: false,
      type: 'content-mismatch',
      contentDiff,
      cursorDiff,
      severity: this.calculateSeverity(contentDiff, cursorDiff)
    };
  }

  /**
   * Compare content strings
   */
  compareContent(blessed, ink) {
    const changes = diff.diffChars(blessed, ink);
    
    const stats = {
      additions: 0,
      deletions: 0,
      changes: 0,
      unchanged: 0
    };
    
    const details = [];
    
    for (const change of changes) {
      if (change.added) {
        stats.additions += change.value.length;
        details.push({ type: 'added', value: change.value });
      } else if (change.removed) {
        stats.deletions += change.value.length;
        details.push({ type: 'removed', value: change.value });
      } else {
        stats.unchanged += change.value.length;
      }
    }
    
    stats.changes = stats.additions + stats.deletions;
    stats.similarity = stats.unchanged / (stats.unchanged + stats.changes);
    
    return {
      stats,
      details,
      visual: this.generateVisualDiff(blessed, ink)
    };
  }

  /**
   * Compare cursor positions
   */
  compareCursors(blessedCursor, inkCursor) {
    if (this.options.ignoreCursorPosition) {
      return { matches: true };
    }
    
    if (!blessedCursor && !inkCursor) {
      return { matches: true };
    }
    
    if (!blessedCursor || !inkCursor) {
      return { 
        matches: false, 
        blessed: blessedCursor, 
        ink: inkCursor 
      };
    }
    
    const xDiff = Math.abs(blessedCursor.x - inkCursor.x);
    const yDiff = Math.abs(blessedCursor.y - inkCursor.y);
    
    return {
      matches: xDiff === 0 && yDiff === 0,
      xDiff,
      yDiff,
      blessed: blessedCursor,
      ink: inkCursor
    };
  }

  /**
   * Generate visual diff for terminal output
   */
  generateVisualDiff(blessed, ink) {
    const blessedLines = blessed.split('\n');
    const inkLines = ink.split('\n');
    const maxLines = Math.max(blessedLines.length, inkLines.length);
    const visual = [];
    
    for (let i = 0; i < maxLines; i++) {
      const bLine = blessedLines[i] || '';
      const iLine = inkLines[i] || '';
      
      if (bLine === iLine) {
        visual.push({
          line: i + 1,
          status: 'same',
          content: bLine
        });
      } else {
        visual.push({
          line: i + 1,
          status: 'different',
          blessed: bLine,
          ink: iLine,
          diff: diff.diffWords(bLine, iLine)
        });
      }
    }
    
    return visual;
  }

  /**
   * Calculate difference severity
   */
  calculateSeverity(contentDiff, cursorDiff) {
    // High severity: Major content differences
    if (contentDiff.stats.similarity < 0.5) {
      return 'high';
    }
    
    // Medium severity: Moderate differences or cursor issues
    if (contentDiff.stats.similarity < 0.8 || 
        (cursorDiff && !cursorDiff.matches)) {
      return 'medium';
    }
    
    // Low severity: Minor differences
    return 'low';
  }

  /**
   * Generate comparison summary
   */
  generateSummary(differences) {
    const summary = {
      total: differences.length,
      bySeverity: { high: 0, medium: 0, low: 0 },
      byType: {},
      criticalIssues: []
    };
    
    for (const diff of differences) {
      // Count by severity
      if (diff.severity) {
        summary.bySeverity[diff.severity]++;
      }
      
      // Count by type
      const type = diff.type || 'unknown';
      summary.byType[type] = (summary.byType[type] || 0) + 1;
      
      // Identify critical issues
      if (diff.severity === 'high' || diff.type === 'missing-frame') {
        summary.criticalIssues.push({
          frame: diff.frameIndex,
          type: diff.type,
          severity: diff.severity
        });
      }
    }
    
    return summary;
  }

  /**
   * Generate detailed comparison report
   */
  generateReport() {
    const comparison = this.compare();
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        matchPercentage: comparison.matchPercentage.toFixed(2) + '%',
        totalFrames: comparison.totalFrames,
        matchingFrames: comparison.matchingFrames,
        differences: comparison.differences
      },
      details: comparison.details.map(diff => ({
        frame: diff.frameIndex,
        type: diff.type,
        severity: diff.severity,
        alignment: diff.alignment,
        content: diff.contentDiff ? {
          similarity: (diff.contentDiff.stats.similarity * 100).toFixed(2) + '%',
          changes: diff.contentDiff.stats.changes
        } : null
      })),
      criticalIssues: comparison.summary.criticalIssues,
      recommendation: this.generateRecommendation(comparison)
    };
  }

  /**
   * Generate recommendation based on comparison
   */
  generateRecommendation(comparison) {
    if (comparison.matchPercentage >= 95) {
      return {
        status: 'excellent',
        message: 'UIs are nearly identical. Safe to migrate.'
      };
    } else if (comparison.matchPercentage >= 85) {
      return {
        status: 'good',
        message: 'Minor differences detected. Review critical issues before migration.'
      };
    } else if (comparison.matchPercentage >= 70) {
      return {
        status: 'warning',
        message: 'Significant differences found. Thorough testing recommended.'
      };
    } else {
      return {
        status: 'critical',
        message: 'Major differences detected. Migration not recommended without fixes.'
      };
    }
  }

  /**
   * Reset comparator state
   */
  reset() {
    this.blessedFrames = [];
    this.inkFrames = [];
    this.comparisonResults = [];
  }
}

module.exports = { OutputComparator };