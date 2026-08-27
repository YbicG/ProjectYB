import { Octokit } from '@octokit/rest';
import { gitService } from './git.service';
import { logger } from '../utils/logger';

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

  async getRepoDetails(token: string, owner: string, repo: string) {
    try {
      const octokit = this.getClient(token);
      const response = await octokit.rest.repos.get({
        owner,
        repo
      });
      return response.data;
    } catch (e: any) {
      if (e.status === 404) {
        return null;
      }
      logger.error(`Error fetching repo details for ${owner}/${repo}`, e);
      return null;
    }
  }

  async listRepositories(token: string) {
    try {
      const octokit = this.getClient(token);
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
      });
      return response.data;
    } catch (e: any) {
      logger.error('Error listing repositories', e);
      return [];
    }
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

  async listPullRequests(token: string, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
    try {
      const octokit = this.getClient(token);
      const response = await octokit.rest.pulls.list({
        owner,
        repo,
        state
      });
      return response.data;
    } catch (e: any) {
      if (e.status === 404) {
        return [];
      }
      logger.error(`Error listing PRs for ${owner}/${repo}`, e);
      return [];
    }
  }

  async createIssue(token: string, owner: string, repo: string, title: string, body?: string, labels?: string[]) {
    const octokit = this.getClient(token);
    const response = await octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels
    });
    return response.data;
  }

  async listIssues(token: string, owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
    try {
      const octokit = this.getClient(token);
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state
      });
      return response.data;
    } catch (e: any) {
      if (e.status === 404) {
        return [];
      }
      logger.error(`Error listing issues for ${owner}/${repo}`, e);
      return [];
    }
  }

  async getUser(token: string) {
    const octokit = this.getClient(token);
    const response = await octokit.rest.users.getAuthenticated();
    return response.data;
  }

  async initAndPushToGitHub(token: string, localPath: string, repoName: string, isPrivate: boolean, description?: string) {
    const repo = await this.createRepository(token, repoName, isPrivate, description);
    
    const isRepo = await gitService.isGitRepo(localPath);
    if (!isRepo) {
      await gitService.init(localPath);
    }
    
    try {
      await gitService.addRemote(localPath, 'origin', repo.clone_url);
    } catch (e) {
      // Remote might exist
    }

    try {
      await gitService.commit(localPath, 'Initial commit from ProjectYB', true);
    } catch (e) {
      // Maybe already committed
    }

    try {
      await gitService.push(localPath, 'origin', 'main');
    } catch (e) {
      // Branch might be master
      try {
        await gitService.push(localPath, 'origin', 'master');
      } catch (err) {
        logger.error('Failed to push to origin', err);
      }
    }

    return repo;
  }
}

export const githubService = new GitHubService();
