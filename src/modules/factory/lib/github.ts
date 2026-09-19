/**
 * The few GitHub REST calls the factory needs to open one PR with a handful of files:
 * read the base branch, build one commit on top of it (Git Data API), point a branch at
 * it and open (or reuse) the pull request. Token, repo and base branch come from the
 * environment; nothing here is tenant data.
 */

export type GitHubConfig = {
  token: string
  /** `owner/name` */
  repo: string
  baseBranch: string
  apiUrl: string
}

export type PullRequestRef = { number: number; htmlUrl: string; headSha: string }

export type CommitFile = { path: string; content: string }

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    body: string,
  ) {
    super(`GitHub ${status} on ${path}: ${body.slice(0, 300)}`)
    this.name = 'GitHubApiError'
  }
}

export const DEFAULT_SITE_REPO = 'jtomaszewski/hackaton-stal-zbiorniki-landing'

export function readGitHubConfigFromEnv(env: NodeJS.ProcessEnv = process.env): GitHubConfig {
  const token = env.FACTORY_GITHUB_TOKEN?.trim()
  if (!token) throw new Error('FACTORY_GITHUB_TOKEN is not set; the factory cannot open pull requests.')
  const repo = env.FACTORY_SITE_REPO?.trim() || DEFAULT_SITE_REPO
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error(`FACTORY_SITE_REPO must be owner/name, got "${repo}"`)
  return {
    token,
    repo,
    baseBranch: env.FACTORY_SITE_BASE_BRANCH?.trim() || 'main',
    apiUrl: env.FACTORY_GITHUB_API_URL?.trim() || 'https://api.github.com',
  }
}

export class GitHubClient {
  constructor(
    private readonly config: GitHubConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get repo(): string {
    return this.config.repo
  }

  get baseBranch(): string {
    return this.config.baseBranch
  }

  private async request<T>(method: string, path: string, body?: unknown, allow404 = false): Promise<T | null> {
    const response = await this.fetchImpl(`${this.config.apiUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.config.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (response.status === 404 && allow404) return null
    const textBody = await response.text()
    if (!response.ok) throw new GitHubApiError(response.status, path, textBody)
    return textBody ? (JSON.parse(textBody) as T) : null
  }

  private repoPath(suffix: string): string {
    return `/repos/${this.config.repo}${suffix}`
  }

  async getBranchSha(branch: string): Promise<string | null> {
    const ref = await this.request<{ object: { sha: string } }>('GET', this.repoPath(`/git/ref/heads/${branch}`), undefined, true)
    return ref?.object.sha ?? null
  }

  async getCommitTreeSha(commitSha: string): Promise<string> {
    const commit = await this.request<{ tree: { sha: string } }>('GET', this.repoPath(`/git/commits/${commitSha}`))
    if (!commit) throw new Error(`Commit ${commitSha} not found`)
    return commit.tree.sha
  }

  async getFileText(path: string, ref: string): Promise<string> {
    const file = await this.request<{ content: string; encoding: string }>(
      'GET',
      this.repoPath(`/contents/${path}?ref=${encodeURIComponent(ref)}`),
    )
    if (!file) throw new Error(`${path} not found at ${ref}`)
    if (file.encoding !== 'base64') throw new Error(`${path}: unexpected encoding ${file.encoding}`)
    return Buffer.from(file.content, 'base64').toString('utf8')
  }

  /** One commit with every file, on top of `parentSha`. Returns the new commit sha. */
  async createCommit(params: { parentSha: string; files: CommitFile[]; message: string }): Promise<string> {
    const baseTree = await this.getCommitTreeSha(params.parentSha)
    const tree = await this.request<{ sha: string }>('POST', this.repoPath('/git/trees'), {
      base_tree: baseTree,
      tree: params.files.map((file) => ({ path: file.path, mode: '100644', type: 'blob', content: file.content })),
    })
    const commit = await this.request<{ sha: string }>('POST', this.repoPath('/git/commits'), {
      message: params.message,
      tree: tree!.sha,
      parents: [params.parentSha],
    })
    return commit!.sha
  }

  /** Creates the branch, or moves it when it already exists (a stale branch from an earlier try). */
  async upsertBranch(branch: string, sha: string): Promise<void> {
    const existing = await this.getBranchSha(branch)
    if (existing === sha) return
    if (existing) {
      await this.request('PATCH', this.repoPath(`/git/refs/heads/${branch}`), { sha, force: true })
      return
    }
    await this.request('POST', this.repoPath('/git/refs'), { ref: `refs/heads/${branch}`, sha })
  }

  async findOpenPullRequest(branch: string): Promise<PullRequestRef | null> {
    const owner = this.config.repo.split('/')[0]
    const list = await this.request<Array<{ number: number; html_url: string; head: { sha: string } }>>(
      'GET',
      this.repoPath(`/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=1`),
    )
    const first = list?.[0]
    return first ? { number: first.number, htmlUrl: first.html_url, headSha: first.head.sha } : null
  }

  async createPullRequest(params: { title: string; body: string; head: string }): Promise<PullRequestRef> {
    const pr = await this.request<{ number: number; html_url: string; head: { sha: string } }>('POST', this.repoPath('/pulls'), {
      title: params.title,
      body: params.body,
      head: params.head,
      base: this.config.baseBranch,
    })
    return { number: pr!.number, htmlUrl: pr!.html_url, headSha: pr!.head.sha }
  }
}
