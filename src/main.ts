import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec } from 'child_process';

async function run() {
  try {
    const token = core.getInput('repo-token', { required: true });
    const client = new github.GitHub(token);

    const pullRequest = await getPullRequest(client);

    if (!pullRequest) {
      console.log('Could not get pull request number from context, exiting');
      console.log(JSON.stringify(github.context, null, 2));

      return;
    }

    const script = exec(
      './node_modules/.bin/standard-version --dry-run --skip.commit --skip.tag',
    );
    if (!script.stdout) return;

    script.stdout.on('data', data => {
      const changelog = /\-{3}(.+?)\-{3}/s;
      const matches = data.match(changelog);

      if (matches) {
        const changelog = matches[1].trim();

        const labels: string[] = [];
        if (changelog.match('### Feature')) labels.push('Type: Feature');
        if (changelog.match('### Bug Fixes')) labels.push('Type: Bug Fix');
        if (changelog.match('### BREAKING CHANGES'))
          labels.push('Breaking Changes');

        if (labels.length > 0) {
          addLabels(client, pullRequest.number, labels);
        }

        // return client.issues.createComment({
        //   body: changelog,
        //   owner: github.context.repo.owner,
        //   repo: github.context.repo.repo,
        //   issue_number

        //   pull_number: pullRequest.number,

        //   // issue_number: prNumber,
        // });
      }
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

interface CommitResponse {
  commit: {
    oid: string;
  };
}

interface PullRequest {
  number: number;
  commits: {
    nodes: CommitResponse[];
  };
}

interface Response {
  repository: null | {
    ref: null | {
      associatedPullRequests: {
        nodes: PullRequest[];
      };
    };
  };
}

async function getPullRequest(
  client: github.GitHub,
): Promise<PullRequest | undefined> {
  const response: Response = await client.graphql(
    `
    query pullRequests($owner: String!, $repo: String!, $ref: String!) {
      repository(owner: $owner, name: $repo) {
        ref(qualifiedName: $ref) {
          associatedPullRequests(states: OPEN, last: 10) {
            nodes {
              number

              commits(last: 1) {
                nodes {
                  commit {
                    oid
                  }
                }
              }
            }
          }
        }
      }
    }
    `,
    {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      ref: github.context.ref,
    },
  );

  let pullRequest: undefined | PullRequest = undefined;

  if (response.repository && response.repository.ref) {
    pullRequest = response.repository.ref.associatedPullRequests.nodes.find(
      pr => {
        return pr.commits.nodes.find(
          commit => commit.commit.oid === github.context.sha,
        );
      },
    );
  }

  if (!pullRequest) {
    return undefined;
  }

  return pullRequest;
}

async function addLabels(
  client: github.GitHub,
  prNumber: number,
  labels: string[],
) {
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels,
  });
}

run();
