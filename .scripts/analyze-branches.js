#!/usr/bin/env node

/**
 * Branch Analysis Script for YouTube Music Desktop App
 * 
 * This script analyzes the git branches in the repository and categorizes them
 * based on their status (active, merged, stale) and type (feature, bugfix, etc.).
 * 
 * Usage: node scripts/analyze-branches.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const STALE_DAYS = 90; // Branches with no commits for 90+ days are considered stale
const MAIN_BRANCHES = ['master', 'development', 'integration'];
const BRANCH_TYPES = {
  'feature': 'feature/',
  'bugfix': 'bugfix/',
  'hotfix': 'hotfix/',
  'release': 'release/',
  'v2-feature': 'v2-feature/',
  'v2-architecture': 'v2-architecture/',
  'v2-build': 'v2-build/',
};

// Helper functions
function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return '';
  }
}

function getCurrentDate() {
  return new Date();
}

function parseDate(dateStr) {
  return new Date(dateStr);
}

function daysBetween(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getBranchType(branchName) {
  for (const [type, prefix] of Object.entries(BRANCH_TYPES)) {
    if (branchName.startsWith(prefix)) {
      return type;
    }
  }
  
  // Special cases
  if (branchName.includes('dependabot')) {
    return 'dependabot';
  }
  if (branchName.includes('cursor')) {
    return 'cursor';
  }
  
  return 'other';
}

function getBranchLastCommitDate(branch) {
  const dateStr = execCommand(`git log -1 --format=%cd ${branch}`);
  return dateStr ? parseDate(dateStr) : null;
}

function isBranchMerged(branch, targetBranch = 'development') {
  const output = execCommand(`git branch --merged ${targetBranch}`);
  if (!output) return false;

  const mergedBranches = output
    .split('\n')
    .map(line => line.trim().replace(/^[*+]\s*/, '').trim())
    .filter(Boolean);

  return mergedBranches.some(b => b === branch);
}

function getBranchCommitCount(branch) {
  return parseInt(execCommand(`git rev-list --count ${branch}`), 10) || 0;
}

function getBranchDivergence(branch, targetBranch = 'development') {
  const ahead = execCommand(`git rev-list --count ${targetBranch}..${branch}`);
  const behind = execCommand(`git rev-list --count ${branch}..${targetBranch}`);
  return {
    ahead: parseInt(ahead, 10) || 0,
    behind: parseInt(behind, 10) || 0
  };
}

// Main function
function analyzeBranches() {
  console.log('Analyzing Git branches...');
  
  // Get all branches
  const localBranches = execCommand('git branch')
    .split('\n')
    .map(b => b.trim().replace(/^\*\s*/, ''))
    .filter(Boolean);
  
  const remoteBranches = execCommand('git branch -r')
    .split('\n')
    .map(b => b.trim())
    .filter(b => !b.includes('->'))
    .map(b => b.replace(/^origin\//, ''))
    .filter(Boolean);
  
  const allBranches = [...new Set([...localBranches, ...remoteBranches])];
  
  // Analyze branches
  const currentDate = getCurrentDate();
  const branchData = [];
  
  for (const branch of allBranches) {
    // Skip if this is a remote tracking branch that points to another branch
    if (branch.includes('->')) continue;
    
    const lastCommitDate = getBranchLastCommitDate(branch);
    if (!lastCommitDate) continue;
    
    const daysSinceLastCommit = daysBetween(lastCommitDate, currentDate);
    const isStale = daysSinceLastCommit > STALE_DAYS;
    const isMerged = isBranchMerged(branch);
    const isMainBranch = MAIN_BRANCHES.includes(branch);
    const branchType = getBranchType(branch);
    const commitCount = getBranchCommitCount(branch);
    const divergence = getBranchDivergence(branch);
    
    branchData.push({
      name: branch,
      type: branchType,
      lastCommit: lastCommitDate.toISOString().split('T')[0],
      daysSinceLastCommit,
      isStale,
      isMerged,
      isMainBranch,
      commitCount,
      ahead: divergence.ahead,
      behind: divergence.behind
    });
  }
  
  // Sort branches by type and name
  branchData.sort((a, b) => {
    if (a.isMainBranch && !b.isMainBranch) return -1;
    if (!a.isMainBranch && b.isMainBranch) return 1;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });
  
  // Generate report
  const report = {
    generatedAt: currentDate.toISOString(),
    summary: {
      totalBranches: branchData.length,
      mainBranches: branchData.filter(b => b.isMainBranch).length,
      featureBranches: branchData.filter(b => b.type === 'feature' || b.type === 'v2-feature').length,
      staleBranches: branchData.filter(b => b.isStale).length,
      mergedBranches: branchData.filter(b => b.isMerged).length
    },
    categories: {
      mainBranches: branchData.filter(b => b.isMainBranch),
      activeBranches: branchData.filter(b => !b.isMainBranch && !b.isStale && !b.isMerged),
      mergedBranches: branchData.filter(b => !b.isMainBranch && b.isMerged),
      staleBranches: branchData.filter(b => !b.isMainBranch && b.isStale && !b.isMerged)
    },
    allBranches: branchData
  };
  
  // Write report to file
  const reportPath = path.join(__dirname, 'branch-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`Branch analysis complete. Report saved to ${reportPath}`);
  console.log('\nSummary:');
  console.log(`- Total branches: ${report.summary.totalBranches}`);
  console.log(`- Main branches: ${report.summary.mainBranches}`);
  console.log(`- Feature branches: ${report.summary.featureBranches}`);
  console.log(`- Stale branches: ${report.summary.staleBranches}`);
  console.log(`- Merged branches: ${report.summary.mergedBranches}`);
  
  // Generate cleanup recommendations
  console.log('\nCleanup Recommendations:');
  
  if (report.categories.mergedBranches.length > 0) {
    console.log('\n1. These branches have been merged and can be safely deleted:');
    report.categories.mergedBranches.forEach(branch => {
      console.log(`   - ${branch.name} (last commit: ${branch.lastCommit})`);
    });
  }
  
  if (report.categories.staleBranches.length > 0) {
    console.log('\n2. These branches are stale (no commits for 90+ days) and might be candidates for deletion:');
    report.categories.staleBranches.forEach(branch => {
      console.log(`   - ${branch.name} (last commit: ${branch.lastCommit}, ${branch.daysSinceLastCommit} days ago)`);
    });
  }
  
  console.log('\n3. Active branches that should be kept:');
  report.categories.mainBranches.forEach(branch => {
    console.log(`   - ${branch.name} (main branch)`);
  });
  report.categories.activeBranches.forEach(branch => {
    console.log(`   - ${branch.name} (last commit: ${branch.lastCommit})`);
  });
  
  return report;
}

// Run the analysis
analyzeBranches();
