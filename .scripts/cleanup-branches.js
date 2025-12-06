#!/usr/bin/env node

/**
 * Branch Cleanup Script for YouTube Music Desktop App
 * 
 * This script helps clean up git branches based on the analysis report.
 * It provides interactive options to delete merged and stale branches.
 * 
 * Usage: node scripts/cleanup-branches.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const REPORT_PATH = path.join(__dirname, 'branch-analysis-report.json');
const PROTECTED_BRANCHES = ['master', 'development', 'integration'];

// Helper functions
function execCommand(command, silent = false) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' }).trim();
  } catch (error) {
    if (!silent) {
      console.error(`Error executing command: ${command}`);
      console.error(error.message);
    }
    return '';
  }
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function confirmAction(message) {
  const answer = await prompt(`${message} (y/n): `);
  return answer.toLowerCase() === 'y';
}

// Main function
async function cleanupBranches() {
  console.log('Branch Cleanup Tool');
  console.log('==================\n');
  
  // Check if report exists
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('Branch analysis report not found. Please run analyze-branches.js first.');
    process.exit(1);
  }
  
  // Load report
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  console.log(`Loaded branch analysis report generated at ${report.generatedAt}`);
  
  // Summary
  console.log('\nBranch Summary:');
  console.log(`- Total branches: ${report.summary.totalBranches}`);
  console.log(`- Merged branches: ${report.categories.mergedBranches.length}`);
  console.log(`- Stale branches: ${report.categories.staleBranches.length}`);
  console.log(`- Active branches: ${report.categories.activeBranches.length}`);
  console.log(`- Main branches: ${report.categories.mainBranches.length}`);
  
  // Create backup
  const backupBranch = `backup-before-cleanup-${Date.now()}`;
  console.log(`\nCreating backup branch '${backupBranch}'...`);
  execCommand(`git branch ${backupBranch}`);
  console.log(`Backup created. You can restore with: git checkout ${backupBranch}`);
  
  // Handle merged branches
  if (report.categories.mergedBranches.length > 0) {
    console.log('\nMerged Branches:');
    report.categories.mergedBranches.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.name} (last commit: ${branch.lastCommit})`);
    });
    
    const deleteMerged = await confirmAction('\nDo you want to delete all merged branches?');
    
    if (deleteMerged) {
      for (const branch of report.categories.mergedBranches) {
        if (PROTECTED_BRANCHES.includes(branch.name)) {
          console.log(`Skipping protected branch: ${branch.name}`);
          continue;
        }
        
        const shouldDelete = await confirmAction(`Delete merged branch '${branch.name}'?`);
        if (shouldDelete) {
          console.log(`Deleting branch: ${branch.name}`);
          
          // Check if branch exists locally
          const localExists = execCommand(`git branch --list ${branch.name}`, true).includes(branch.name);
          if (localExists) {
            execCommand(`git branch -d ${branch.name}`);
          }
          
          // Check if branch exists remotely
          const remoteExists = execCommand(`git branch -r --list origin/${branch.name}`, true).includes(`origin/${branch.name}`);
          if (remoteExists) {
            const shouldDeleteRemote = await confirmAction(`Delete remote branch 'origin/${branch.name}'?`);
            if (shouldDeleteRemote) {
              execCommand(`git push origin --delete ${branch.name}`);
            }
          }
        }
      }
    }
  }
  
  // Handle stale branches
  if (report.categories.staleBranches.length > 0) {
    console.log('\nStale Branches:');
    report.categories.staleBranches.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.name} (last commit: ${branch.lastCommit}, ${branch.daysSinceLastCommit} days ago)`);
    });
    
    const handleStale = await confirmAction('\nDo you want to handle stale branches?');
    
    if (handleStale) {
      for (const branch of report.categories.staleBranches) {
        if (PROTECTED_BRANCHES.includes(branch.name)) {
          console.log(`Skipping protected branch: ${branch.name}`);
          continue;
        }
        
        console.log(`\nStale branch: ${branch.name}`);
        console.log(`- Last commit: ${branch.lastCommit} (${branch.daysSinceLastCommit} days ago)`);
        console.log(`- Commits ahead of development: ${branch.ahead}`);
        console.log(`- Commits behind development: ${branch.behind}`);
        
        const action = await prompt('What action to take? (d)elete, (k)eep, (a)rchive: ');
        
        if (action.toLowerCase() === 'd') {
          console.log(`Deleting branch: ${branch.name}`);
          
          // Check if branch exists locally
          const localExists = execCommand(`git branch --list ${branch.name}`, true).includes(branch.name);
          if (localExists) {
            execCommand(`git branch -D ${branch.name}`);
          }
          
          // Check if branch exists remotely
          const remoteExists = execCommand(`git branch -r --list origin/${branch.name}`, true).includes(`origin/${branch.name}`);
          if (remoteExists) {
            const shouldDeleteRemote = await confirmAction(`Delete remote branch 'origin/${branch.name}'?`);
            if (shouldDeleteRemote) {
              execCommand(`git push origin --delete ${branch.name}`);
            }
          }
        } else if (action.toLowerCase() === 'a') {
          const archiveBranchName = `archive/${branch.name}`;
          console.log(`Archiving branch as ${archiveBranchName}`);
          
          // Create archive branch
          execCommand(`git checkout ${branch.name}`);
          execCommand(`git checkout -b ${archiveBranchName}`);
          execCommand(`git checkout -`);
          
          // Delete original branch
          execCommand(`git branch -D ${branch.name}`);
          
          // Push archive branch if remote exists
          const remoteExists = execCommand(`git branch -r --list origin/${branch.name}`, true).includes(`origin/${branch.name}`);
          if (remoteExists) {
            const shouldPushArchive = await confirmAction(`Push archive branch and delete remote original?`);
            if (shouldPushArchive) {
              execCommand(`git push origin ${archiveBranchName}`);
              execCommand(`git push origin --delete ${branch.name}`);
            }
          }
        } else {
          console.log(`Keeping branch: ${branch.name}`);
        }
      }
    }
  }
  
  console.log('\nBranch cleanup completed.');
}

// Run the cleanup
cleanupBranches().catch(console.error);
