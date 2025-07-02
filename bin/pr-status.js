#!/usr/bin/env node

const { Command } = require('commander');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const chalk = require('chalk');
const ora = require('ora');

const program = new Command();

program
  .name('pr-status')
  .description('Check GitHub PR status across multiple repositories with beautiful HTML dashboard')
  .version('1.0.0')
  .argument('<repos>', 'Comma-separated list of repositories (owner/repo,owner/repo2)')
  .option('-d, --days <number>', 'Number of days to look back', '10')
  .option('-a, --author <username>', 'GitHub username to filter PRs (default: auto-detect)')
  .option('-f, --format <format>', 'Output format: html or markdown', 'html')
  .option('--no-open', 'Do not open HTML file in browser')
  .helpOption('-h, --help', 'Display help for command');

program.parse();

const options = program.opts();
const repos = program.args[0];

if (!repos) {
  console.error(chalk.red('❌ Error: Repositories parameter is required!'));
  console.log('Usage: pr-status "repo1,repo2" [options]');
  console.log('Run \'pr-status --help\' for more information.');
  process.exit(1);
}

// Check if gh CLI is available
try {
  execSync('gh --version', { stdio: 'ignore' });
} catch (error) {
  console.error(chalk.red('❌ GitHub CLI (gh) is not installed. Please install it first.'));
  console.log('Visit: https://cli.github.com/');
  process.exit(1);
}

const reposArray = repos.split(',').map(repo => repo.trim());
const daysLimit = parseInt(options.days);
let author = options.author;
const format = options.format;

async function main() {
  // Auto-detect author if not provided
  if (!author) {
    const spinner = ora('🔍 Auto-detecting GitHub username...').start();
    try {
      author = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
      spinner.succeed(`✅ Detected GitHub user: ${author}`);
    } catch (error) {
      spinner.fail('❌ Could not detect GitHub username. Please make sure you\'re authenticated with \'gh auth login\'');
      console.log('Or provide the author manually with -a option');
      process.exit(1);
    }
  }

  console.log(chalk.blue(`🔍 Checking open PRs by ${author} (within ${daysLimit} days)...`));
  console.log(chalk.gray(`📂 Repositories: ${reposArray.join(', ')}`));
  console.log('');

  const currentDate = Math.floor(Date.now() / 1000);
  const daysLimitSeconds = daysLimit * 86400;
  const recentPrs = [];

  const searchSpinner = ora('📡 Searching for PRs...').start();

  // Search for recent PRs
  for (const repo of reposArray) {
    searchSpinner.text = `  Checking ${repo}...`;
    try {
      const prsJson = execSync(
        `gh search prs --repo "${repo}" --author "${author}" --state open --json number,title,updatedAt --limit 20`,
        { encoding: 'utf8' }
      );
      
      const prs = JSON.parse(prsJson);
      
      for (const pr of prs) {
        const updatedTimestamp = Math.floor(new Date(pr.updatedAt).getTime() / 1000);
        const daysAgo = Math.floor((currentDate - updatedTimestamp) / 86400);
        
        if (daysAgo <= daysLimit) {
          recentPrs.push(`${repo}:${pr.number}`);
        }
      }
    } catch (error) {
      // Silently continue if repo search fails
    }
  }

  searchSpinner.succeed(`Found ${recentPrs.length} recent PRs`);

  if (recentPrs.length === 0) {
    console.log(chalk.yellow(`No recent PRs found within ${daysLimit} days.`));
    return;
  }

  let htmlFile;
  if (format === 'html') {
    // Create consistent filename
    const paramsString = `${author}_${reposArray.join('_')}`;
    const paramsHash = crypto.createHash('sha256').update(paramsString).digest('hex').substring(0, 8);
    
    let repoSuffix;
    if (reposArray.length === 1) {
      repoSuffix = reposArray[0].split('/')[1].toLowerCase();
    } else if (reposArray.length <= 4) {
      repoSuffix = reposArray.map(r => r.split('/')[1]).join('+').toLowerCase();
    } else {
      repoSuffix = `${reposArray.length}repos`;
    }
    
    htmlFile = path.join(os.tmpdir(), `pr-status-${author}-${repoSuffix}-${paramsHash}.html`);
    
    console.log(chalk.gray(`📄 HTML file: ${htmlFile}`));
    
    // Initialize HTML file
    const htmlHeader = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PR Status Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .animate-pulse-slow { animation: pulse 2s infinite; }
        .status-badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
        .repo-badge { @apply inline-flex items-center px-3 py-1 rounded-full text-sm font-medium; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">🚀 PR Status Dashboard</h1>
            <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                <span class="flex items-center"><span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Author: ${author}</span>
                <span class="flex items-center"><span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Last ${daysLimit} days</span>
                <span class="flex items-center"><span class="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>Generated: ${new Date().toLocaleString()}</span>
            </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PR</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repository</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Labels</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CI Status</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">`;
    
    fs.writeFileSync(htmlFile, htmlHeader);
  } else {
    console.log('');
    console.log('| PR | Repository | Title | Days Ago | Labels | CI Status | Details |');
    console.log('|---|---|---|---|---|---|---|');
  }

  const processSpinner = ora('Processing PRs...').start();

  // Process each recent PR
  for (let i = 0; i < recentPrs.length; i++) {
    const [repo, prNum] = recentPrs[i].split(':');
    processSpinner.text = `Processing PR #${prNum} in ${repo} (${i + 1}/${recentPrs.length})`;
    
    try {
      // Get PR details
      const prDataJson = execSync(
        `gh api "/repos/${repo}/pulls/${prNum}" --jq '{title: .title, updated_at: .updated_at, labels: [.labels[].name], head_sha: .head.sha}'`,
        { encoding: 'utf8' }
      );
      
      const prData = JSON.parse(prDataJson);
      const { title, updated_at, labels, head_sha } = prData;
      
      // Calculate days ago and format local time
      const updatedTimestamp = Math.floor(new Date(updated_at).getTime() / 1000);
      const daysAgo = Math.floor((currentDate - updatedTimestamp) / 86400);
      const localTime = new Date(updatedTimestamp * 1000).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      // Get CI status
      let ciStatus, details, ciClass, ciIcon;
      try {
        const checkRunsJson = execSync(
          `gh api "/repos/${repo}/commits/${head_sha}/check-runs" --jq '[.check_runs[] | {name: .name, status: .status, conclusion: .conclusion}]'`,
          { encoding: 'utf8' }
        );
        
        const checkRuns = JSON.parse(checkRunsJson);
        
        if (checkRuns.length === 0) {
          ciStatus = 'No CI';
          details = 'No checks configured';
          ciClass = 'bg-gray-100 text-gray-800';
          ciIcon = '⚪';
        } else {
          const failedCount = checkRuns.filter(run => run.conclusion === 'failure').length;
          const successCount = checkRuns.filter(run => run.conclusion === 'success').length;
          const pendingCount = checkRuns.filter(run => run.status === 'in_progress' || run.status === 'queued').length;
          
          if (failedCount > 0) {
            ciStatus = 'Failed';
            details = `${failedCount} failed, ${successCount} passed`;
            ciClass = 'bg-red-100 text-red-800';
            ciIcon = '❌';
          } else if (pendingCount > 0) {
            ciStatus = 'Running';
            details = `${pendingCount} running, ${successCount} passed`;
            ciClass = 'bg-yellow-100 text-yellow-800 animate-pulse-slow';
            ciIcon = '⏳';
          } else {
            ciStatus = 'Passed';
            details = `All ${successCount} checks passed`;
            ciClass = 'bg-green-100 text-green-800';
            ciIcon = '✅';
          }
        }
      } catch (error) {
        ciStatus = 'No CI';
        details = 'No checks configured';
        ciClass = 'bg-gray-100 text-gray-800';
        ciIcon = '⚪';
      }
      
      // Repo color mapping
      let repoClass;
      if (repo.includes('server')) repoClass = 'bg-blue-100 text-blue-800';
      else if (repo.includes('client')) repoClass = 'bg-purple-100 text-purple-800';
      else if (repo.includes('app')) repoClass = 'bg-green-100 text-green-800';
      else if (repo.includes('batch')) repoClass = 'bg-orange-100 text-orange-800';
      else repoClass = 'bg-gray-100 text-gray-800';
      
      if (format === 'html') {
        // HTML output
        const repoDisplay = repo.replace(/^[^\/]+\//, ''); // Remove org prefix
        const htmlRow = `
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <a href="https://github.com/${repo}/pull/${prNum}" target="_blank" 
                                   class="text-blue-600 hover:text-blue-900 font-medium">#${prNum}</a>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="repo-badge ${repoClass}">${repoDisplay}</span>
                            </td>
                            <td class="px-6 py-4">
                                <div class="text-sm text-gray-900 font-medium">${title.replace(/"/g, '&quot;')}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div>${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago</div>
                                <div class="text-xs text-gray-400">${localTime}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">`;
        
        fs.appendFileSync(htmlFile, htmlRow);
        
        // Add labels
        if (labels.length > 0) {
          for (const label of labels) {
            if (label === 'Self Reviewed') {
              fs.appendFileSync(htmlFile, `                                <span class="status-badge bg-green-100 text-green-800 mr-1 mb-1">✅ ${label}</span>\n`);
            } else {
              fs.appendFileSync(htmlFile, `                                <span class="status-badge bg-gray-100 text-gray-800 mr-1 mb-1">${label}</span>\n`);
            }
          }
        } else {
          fs.appendFileSync(htmlFile, '                                <span class="text-gray-400 text-sm">No labels</span>\n');
        }
        
        const htmlFooter = `
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <a href="https://github.com/${repo}/pull/${prNum}/checks" target="_blank" 
                                       class="status-badge ${ciClass} mr-2 hover:opacity-80 transition-opacity">${ciIcon} ${ciStatus}</a>
                                </div>
                                <div class="text-xs text-gray-500 mt-1">${details}</div>
                            </td>
                        </tr>`;
        
        fs.appendFileSync(htmlFile, htmlFooter);
      } else {
        // Markdown output
        let labelsText = labels.join(', ');
        if (labels.includes('Self Reviewed')) {
          labelsText += ' ✅';
        }
        
        const truncatedTitle = title.length > 60 ? title.substring(0, 60) + '...' : title;
        
        console.log(`| [#${prNum}](https://github.com/${repo}/pull/${prNum}) | ${repo} | ${truncatedTitle} | ${daysAgo} | ${labelsText} | [${ciIcon} ${ciStatus}](https://github.com/${repo}/pull/${prNum}/checks) | ${details} |`);
      }
    } catch (error) {
      // Skip this PR if there's an error
      continue;
    }
  }

  processSpinner.succeed('Processing complete');

  if (format === 'html') {
    // Close HTML
    const htmlFooter = `
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="mt-8 text-center">
            <div class="inline-flex items-center space-x-4 text-sm text-gray-500">
                <span class="flex items-center"><span class="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></span>✅ Passed</span>
                <span class="flex items-center"><span class="w-3 h-3 bg-red-100 border border-red-300 rounded mr-2"></span>❌ Failed</span>
                <span class="flex items-center"><span class="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-2"></span>⏳ Running</span>
                <span class="flex items-center"><span class="w-3 h-3 bg-gray-100 border border-gray-300 rounded mr-2"></span>⚪ No CI</span>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    fs.appendFileSync(htmlFile, htmlFooter);
    
    console.log('');
    console.log(chalk.green(`📊 HTML report generated: ${htmlFile}`));
    
    if (options.open !== false) {
      console.log(chalk.blue('🌐 Opening in browser...'));
      const openCommand = process.platform === 'darwin' ? 'open' : 
                         process.platform === 'win32' ? 'start' : 'xdg-open';
      spawn(openCommand, [htmlFile], { detached: true, stdio: 'ignore' });
    }
  } else {
    console.log('');
    console.log(chalk.green('📊 Summary:'));
    console.log(`  - Author: ${author}`);
    console.log(`  - Time range: Last ${daysLimit} days`);
    console.log(`  - Repositories: ${reposArray.join(', ')}`);
    console.log(`  - Generated: ${new Date().toLocaleString()}`);
  }
}

main().catch(error => {
  console.error(chalk.red('❌ Error:'), error.message);
  process.exit(1);
});