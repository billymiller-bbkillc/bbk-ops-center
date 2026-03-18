import type { GitHubTask, TaskColumn, TaskPriority } from '../../shared/types';

const GITHUB_PAT = process.env.GITHUB_PAT || '';
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'billymiller-bbkillc';

const KNOWN_REPOS = [
  'Billy-Miller-Professional-portfolio',
  'SalesPipeCRM',
  'bbk-ops-center',
  'clarigo',
  'clawbot',
  'modivaro',
  'nexfolio-launchpad-crm',
  'realforeclosure-bot-files',
  'repo',
];

const COLUMN_LABELS: Record<string, TaskColumn> = {
  backlog: 'backlog',
  todo: 'todo',
  'in-progress': 'in_progress',
  review: 'review',
  done: 'done',
};

const COLUMN_TO_LABEL: Record<TaskColumn, string> = {
  backlog: 'backlog',
  todo: 'todo',
  in_progress: 'in-progress',
  review: 'review',
  done: 'done',
};

const PRIORITY_LABELS: Record<string, TaskPriority> = {
  'priority:critical': 'critical',
  'priority:high': 'high',
  'priority:medium': 'medium',
  'priority:low': 'low',
};

const PRIORITY_TO_LABEL: Record<TaskPriority, string> = {
  critical: 'priority:critical',
  high: 'priority:high',
  medium: 'priority:medium',
  low: 'priority:low',
};

// Cache
let cachedIssues: { data: GitHubTask[]; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

async function ghFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }

  return res.json();
}

function mapIssueToTask(issue: any, repoName: string): GitHubTask {
  const labels: string[] = issue.labels?.map((l: any) => (typeof l === 'string' ? l : l.name)) || [];

  // Determine column from labels
  let column: TaskColumn = 'backlog';
  if (issue.state === 'closed') {
    column = 'done';
  } else {
    for (const label of labels) {
      const lower = label.toLowerCase();
      if (COLUMN_LABELS[lower]) {
        column = COLUMN_LABELS[lower];
        break;
      }
    }
  }

  // Determine priority from labels
  let priority: TaskPriority = 'medium';
  for (const label of labels) {
    const lower = label.toLowerCase();
    if (PRIORITY_LABELS[lower]) {
      priority = PRIORITY_LABELS[lower];
      break;
    }
  }

  const assignees: string[] = issue.assignees?.map((a: any) => a.login?.toLowerCase()) || [];
  const assignee = assignees[0] || null;

  return {
    id: `${repoName}/${issue.number}`,
    repo: repoName,
    issueNumber: issue.number,
    title: issue.title,
    description: issue.body || '',
    priority,
    column,
    assignee,
    assignees,
    labels,
    url: issue.html_url,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
  };
}

export async function getRepos(): Promise<string[]> {
  return KNOWN_REPOS;
}

export async function getIssues(repo?: string): Promise<GitHubTask[]> {
  // Check cache (only for all-repos fetch)
  if (!repo && cachedIssues && Date.now() - cachedIssues.timestamp < CACHE_TTL) {
    return cachedIssues.data;
  }

  const repos = repo ? [repo] : KNOWN_REPOS;
  const allTasks: GitHubTask[] = [];

  const results = await Promise.allSettled(
    repos.map(async (r) => {
      try {
        // Fetch open and closed issues (up to 100 each)
        const [open, closed] = await Promise.all([
          ghFetch(`/repos/${GITHUB_OWNER}/${r}/issues?state=open&per_page=100`),
          ghFetch(`/repos/${GITHUB_OWNER}/${r}/issues?state=closed&per_page=30&sort=updated`),
        ]);
        // Filter out pull requests (they show up in issues endpoint)
        const allIssues = [...open, ...closed].filter((i: any) => !i.pull_request);
        return allIssues.map((issue: any) => mapIssueToTask(issue, r));
      } catch (err) {
        console.error(`Failed to fetch issues for ${r}:`, err);
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allTasks.push(...result.value);
    }
  }

  // Cache if fetching all
  if (!repo) {
    cachedIssues = { data: allTasks, timestamp: Date.now() };
  }

  return allTasks;
}

export function invalidateCache() {
  cachedIssues = null;
}

export async function createIssue(
  repo: string,
  title: string,
  body?: string,
  assignees?: string[],
  labels?: string[]
): Promise<GitHubTask> {
  const issue = await ghFetch(`/repos/${GITHUB_OWNER}/${repo}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      body: body || '',
      assignees: assignees || [],
      labels: labels || [],
    }),
  });

  invalidateCache();
  return mapIssueToTask(issue, repo);
}

export async function updateIssue(
  repo: string,
  issueNumber: number,
  updates: {
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
    assignees?: string[];
    labels?: string[];
  }
): Promise<GitHubTask> {
  const issue = await ghFetch(`/repos/${GITHUB_OWNER}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  invalidateCache();
  return mapIssueToTask(issue, repo);
}

export async function closeIssue(repo: string, issueNumber: number): Promise<GitHubTask> {
  return updateIssue(repo, issueNumber, { state: 'closed' });
}

export async function moveIssueToColumn(
  repo: string,
  issueNumber: number,
  newColumn: TaskColumn
): Promise<GitHubTask> {
  // First get current labels
  const issue = await ghFetch(`/repos/${GITHUB_OWNER}/${repo}/issues/${issueNumber}`);
  const currentLabels: string[] = issue.labels?.map((l: any) => l.name) || [];

  // Remove old column labels, add new one
  const columnLabelValues = Object.keys(COLUMN_LABELS);
  const filteredLabels = currentLabels.filter(
    (l) => !columnLabelValues.includes(l.toLowerCase())
  );
  filteredLabels.push(COLUMN_TO_LABEL[newColumn]);

  const updates: any = { labels: filteredLabels };

  // If moving to done, close the issue; if moving from done, reopen
  if (newColumn === 'done') {
    updates.state = 'closed';
  } else if (issue.state === 'closed') {
    updates.state = 'open';
  }

  return updateIssue(repo, issueNumber, updates);
}

export function buildLabelsForTask(
  column: TaskColumn,
  priority: TaskPriority
): string[] {
  const labels: string[] = [];
  labels.push(COLUMN_TO_LABEL[column]);
  labels.push(PRIORITY_TO_LABEL[priority]);
  return labels;
}

export { KNOWN_REPOS, COLUMN_TO_LABEL, PRIORITY_TO_LABEL };
