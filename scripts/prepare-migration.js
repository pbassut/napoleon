#!/usr/bin/env node

/**
 * Preparation script for Blessed to Ink migration
 * This script helps prepare the codebase for removing Blessed dependencies
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

async function analyzeBlessedUsage() {
  console.log(chalk.blue('🔍 Analyzing Blessed usage in codebase...\n'));
  
  const results = {
    blessedFiles: [],
    blessedImports: [],
    blessedComponents: [],
    configFiles: []
  };

  // Find all JavaScript files
  async function findFiles(dir, pattern = /\.js$/) {
    const files = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules and other directories
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'coverage', 'dist'].includes(entry.name)) {
            files.push(...await findFiles(fullPath, pattern));
          }
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return files;
  }

  const files = await findFiles(process.cwd());
  
  // Analyze each file
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for Blessed imports
      if (content.includes('blessed') || content.includes('blessed-contrib')) {
        results.blessedFiles.push(file);
        
        // Extract import statements
        const importMatches = content.match(/require\(['"]blessed(-contrib)?['"]\)/g);
        if (importMatches) {
          results.blessedImports.push({
            file,
            imports: importMatches
          });
        }
        
        // Look for Blessed component usage
        const componentMatches = content.match(/blessed\.(box|list|form|screen|element|text|input|button|table|chart|gauge)/gi);
        if (componentMatches) {
          results.blessedComponents.push({
            file,
            components: [...new Set(componentMatches)]
          });
        }
      }
      
      // Check for configuration files
      if (file.includes('config') && content.includes('blessed')) {
        results.configFiles.push(file);
      }
    } catch (error) {
      // Ignore read errors
    }
  }
  
  return results;
}

async function generateMigrationReport(results) {
  console.log(chalk.green('📋 Migration Analysis Report\n'));
  
  console.log(chalk.yellow('Files using Blessed:'));
  if (results.blessedFiles.length > 0) {
    results.blessedFiles.forEach(file => {
      console.log(`  • ${path.relative(process.cwd(), file)}`);
    });
  } else {
    console.log('  ✅ No files found using Blessed');
  }
  
  console.log('\n' + chalk.yellow('Blessed Components Used:'));
  const allComponents = new Set();
  results.blessedComponents.forEach(({ components }) => {
    components.forEach(c => allComponents.add(c));
  });
  
  if (allComponents.size > 0) {
    [...allComponents].forEach(component => {
      console.log(`  • ${component}`);
    });
  } else {
    console.log('  ✅ No Blessed components found');
  }
  
  console.log('\n' + chalk.yellow('Configuration Files:'));
  if (results.configFiles.length > 0) {
    results.configFiles.forEach(file => {
      console.log(`  • ${path.relative(process.cwd(), file)}`);
    });
  } else {
    console.log('  ✅ No configuration files reference Blessed');
  }
  
  // Save report
  const reportPath = path.join(process.cwd(), 'migration-report.json');
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Detailed report saved to: ${reportPath}`);
}

async function checkInkReadiness() {
  console.log('\n' + chalk.blue('🎯 Checking Ink UI Readiness...\n'));
  
  const checks = {
    inkUI: false,
    inkComponents: false,
    parallelTests: false,
    documentation: false
  };
  
  // Check if Ink UI exists
  try {
    await fs.access(path.join(process.cwd(), 'src/ui/ink'));
    checks.inkUI = true;
    console.log(chalk.green('✅ Ink UI directory found'));
  } catch {
    console.log(chalk.red('❌ Ink UI directory not found'));
  }
  
  // Check for key Ink components
  const requiredComponents = [
    'src/ui/ink/index.js',
    'src/ui/ink/components/AgentList',
    'src/ui/ink/components/SpawnDialog'
  ];
  
  let componentsFound = 0;
  for (const component of requiredComponents) {
    try {
      await fs.access(path.join(process.cwd(), component));
      componentsFound++;
    } catch {
      console.log(chalk.yellow(`⚠️  Missing component: ${component}`));
    }
  }
  
  checks.inkComponents = componentsFound === requiredComponents.length;
  if (checks.inkComponents) {
    console.log(chalk.green('✅ All required Ink components found'));
  }
  
  // Check for parallel tests
  try {
    await fs.access(path.join(process.cwd(), 'test-parallel-ui.js'));
    checks.parallelTests = true;
    console.log(chalk.green('✅ Parallel testing framework found'));
  } catch {
    console.log(chalk.yellow('⚠️  Parallel testing framework not found'));
  }
  
  // Check documentation
  try {
    await fs.access(path.join(process.cwd(), 'docs/terminal-compatibility-matrix.md'));
    checks.documentation = true;
    console.log(chalk.green('✅ Migration documentation found'));
  } catch {
    console.log(chalk.yellow('⚠️  Migration documentation not found'));
  }
  
  return checks;
}

async function generateMigrationChecklist() {
  console.log('\n' + chalk.blue('📝 Migration Checklist\n'));
  
  const checklist = [
    { done: false, task: 'Run parallel UI tests to ensure parity' },
    { done: false, task: 'Update all entry points to use Ink by default' },
    { done: false, task: 'Test with --use-legacy-ui flag' },
    { done: false, task: 'Update README.md with new UI information' },
    { done: false, task: 'Create user migration guide' },
    { done: false, task: 'Tag current version as pre-migration' },
    { done: false, task: 'Test on all supported platforms' },
    { done: false, task: 'Update CI/CD pipelines' },
    { done: false, task: 'Notify users of upcoming changes' },
    { done: false, task: 'Plan rollback strategy' }
  ];
  
  checklist.forEach(({ done, task }) => {
    console.log(`  ${done ? chalk.green('✅') : chalk.gray('☐')} ${task}`);
  });
  
  // Save checklist
  const checklistPath = path.join(process.cwd(), 'migration-checklist.md');
  const checklistContent = `# Napoleon UI Migration Checklist

## Pre-Migration Tasks

${checklist.map(({ done, task }) => `- [${done ? 'x' : ' '}] ${task}`).join('\n')}

## Migration Steps

1. [ ] Ensure all tests pass
2. [ ] Create backup branch
3. [ ] Update package.json scripts
4. [ ] Remove blessed from dependencies
5. [ ] Clean up Blessed code
6. [ ] Run integration tests
7. [ ] Deploy to staging
8. [ ] Monitor for issues
9. [ ] Deploy to production
10. [ ] Archive legacy code

## Post-Migration

- [ ] Monitor error rates for 7 days
- [ ] Gather user feedback
- [ ] Address any critical issues
- [ ] Remove legacy UI code (after 30 days)
- [ ] Update all documentation
`;
  
  await fs.writeFile(checklistPath, checklistContent);
  console.log(`\n📁 Checklist saved to: ${checklistPath}`);
}

async function main() {
  console.log(chalk.bold('\n🚀 Napoleon Blessed to Ink Migration Preparation\n'));
  console.log('This script analyzes your codebase and prepares for the migration.\n');
  
  try {
    // Analyze current Blessed usage
    const analysisResults = await analyzeBlessedUsage();
    await generateMigrationReport(analysisResults);
    
    // Check Ink readiness
    const readiness = await checkInkReadiness();
    
    // Generate migration checklist
    await generateMigrationChecklist();
    
    // Final summary
    console.log('\n' + chalk.bold('📊 Migration Readiness Summary\n'));
    
    const isReady = Object.values(readiness).every(v => v);
    
    if (isReady) {
      console.log(chalk.green('✅ Your codebase appears ready for migration!'));
      console.log('\nNext steps:');
      console.log('1. Run parallel UI tests: npm run test:parallel');
      console.log('2. Test with legacy flag: napoleon start --use-legacy-ui');
      console.log('3. Review the migration checklist');
    } else {
      console.log(chalk.yellow('⚠️  Some preparation steps may be needed.'));
      console.log('\nPlease address the issues above before proceeding.');
    }
    
    console.log('\n' + chalk.blue('Good luck with your migration! 🎉\n'));
    
  } catch (error) {
    console.error(chalk.red('Error during analysis:'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}