import { Octokit } from '@octokit/rest';
import { gitService } from './git.service';

class GitHubService {
  private getClient(token: string) {
    return new Octokit({ auth: token });
  }

  async createRepository(token: string, name: string, isPrivate: boolean, description?: string) {
    const octokit = this.getClient(token);
    const response = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      private: isPrivate,
      description
    });
    return response.data;
  }

  async listRepositories(token: string) {
    const octokit = this.getClient(token);
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });
    return response.data;
  }

  async createPullRequest(token: string, owner: string, repo: string, title: string, head: string, base: string, body?: string) {
    const octokit = this.getClient(token);
    const response = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body
    });
    return response.data;
  }

  async listPullRequests(token: string, owner: string, repo: string) {
    const octokit = this.getClient(token);
    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open'
    });
    return response.data;
  }

  async listIssues(token: string, owner: string, repo: string) {
    const octokit = this.getClient(token);
    const response = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'open'
    });
    return response.data;
  }

  async getUser(token: string) {
    const octokit = this.getClient(token);
    const response = await octokit.rest.users.getAuthenticated();
    return response.data;
  }

  async initAndPushToGitHub(token: string, localPath: string, repoName: string, isPrivate: boolean) {
    const repo = await this.createRepository(token, repoName, isPrivate);
    
    const isRepo = await gitService.isGitRepo(localPath);
    if (!isRepo) {
      await gitService.init(localPath);
    }
    
    try {
      await gitService.addRemote(localPath, 'origin', repo.clone_url);
    } catch (e) {
      // Remote might exist
    }

    await gitService.commit(localPath, 'Initial commit', true);
    await gitService.push(localPath, 'origin', 'main');

    return repo;
  }
}

export const githubService = new GitHubService();
