# PR Status CLI

🚀 Check GitHub PR status across multiple repositories with a beautiful HTML dashboard

## Features

- **Multi-repository support** - Check PRs across multiple GitHub repositories simultaneously
- **Beautiful HTML dashboard** - Rich, interactive dashboard with Tailwind CSS styling
- **CI status integration** - Real-time CI/CD status with clickable links to GitHub checks
- **Auto-detection** - Automatically detects your GitHub username via `gh` CLI
- **Flexible output** - Choose between HTML dashboard or Markdown table output
- **Smart filtering** - Filter by author, time range, and repository
- **Local timezone** - Times displayed in your local timezone
- **Color-coded repositories** - Easy visual distinction between different repositories

## Installation

```bash
# Run directly with npx (recommended)
npx pr-status-cli "owner/repo1,owner/repo2"

# Or install globally
npm install -g pr-status-cli
pr-status "owner/repo1,owner/repo2"
```

## Prerequisites

- [GitHub CLI (gh)](https://cli.github.com/) installed and authenticated
- Node.js 14.0.0 or higher

## Usage

### Basic usage
```bash
# Check PRs for multiple repositories (auto-detects your GitHub username)
npx pr-status-cli "facebook/react,microsoft/vscode"

# Single repository
npx pr-status-cli "vercel/next.js"
```

### Advanced options
```bash
# Specify time range and author
npx pr-status-cli "owner/repo1,owner/repo2" --days 7 --author username

# Markdown output instead of HTML
npx pr-status-cli "owner/repo" --format markdown

# Don't open browser automatically
npx pr-status-cli "owner/repo" --no-open

# Get help
npx pr-status-cli --help
```

### Command options

- `<repos>` - Comma-separated list of repositories (required)
- `-d, --days <number>` - Number of days to look back (default: 10)
- `-a, --author <username>` - GitHub username to filter PRs (default: auto-detect)
- `-f, --format <format>` - Output format: html or markdown (default: html)
- `--no-open` - Do not open HTML file in browser

## Examples

### Open source projects
```bash
npx pr-status-cli "facebook/react,microsoft/vscode,vercel/next.js"
```

### Your organization's repositories
```bash
npx pr-status-cli "yourorg/backend,yourorg/frontend,yourorg/mobile"
```

### Last 30 days with markdown output
```bash
npx pr-status-cli "owner/repo" --days 30 --format markdown
```

### Specific author
```bash
npx pr-status-cli "owner/repo1,owner/repo2" --author octocat
```

## Output

### HTML Dashboard
- Beautiful, responsive web interface
- Clickable PR numbers and CI status links
- Color-coded repositories and status badges
- Hover effects and smooth transitions
- Local timezone display

### Markdown Table
- Perfect for copying into GitHub issues or documentation
- Includes all essential PR information
- Clickable links to PRs and CI checks

## Authentication

This tool uses the GitHub CLI (`gh`) for authentication. Make sure you're logged in:

```bash
gh auth login
```

The tool will automatically detect your GitHub username and use your existing authentication.

## File locations

HTML reports are saved to your system's temporary directory with consistent filenames based on the parameters used. This allows for easy bookmarking and prevents duplicate files.

Example: `/tmp/pr-status-yourusername-repo1+repo2-a1b2c3d4.html`

## License

MIT