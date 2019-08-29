import * as core from '@actions/core';
import * as github from '@actions/github';

import { exec } from 'child_process';

async function run() {
  try {
    const token = core.getInput('repo-token', { required: true });

    const prNumber = getPrNumber();
    if (!prNumber) {
      console.log(JSON.stringify(github.context, null, 2));

      console.log('Could not get pull request number from context, exiting');
      return;
    }

    const client = new github.GitHub(token);

    const script = exec(
      './node_modules/.bin/standard-version --dry-run --skip.commit --skip.tag',
    );
    if (!script.stdout) return;

    script.stdout.on('data', data => {
      const changelog = /\-{3}(.+?)\-{3}/s;
      const matches = data.match(changelog);
      console.log(data);

      if (matches) {
        const log = matches[1].trim();

        const labels: string[] = [];
        if (log.match('### Feature')) labels.push('Type: Feature');
        if (log.match('### Bug Fixes')) labels.push('Type: Bug Fix');
        if (log.match('### BREAKING CHANGES')) labels.push('Breaking Changes');

        if (labels.length > 0) {
          addLabels(client, prNumber, labels);
        }

        // await client.pulls.createComment({
        //   body: log,
        //   owner: github.context.repo.owner,
        //   repo: github.context.repo.repo,
        //   commit_id: github.context.sha,

        //   // issue_number: prNumber,
        // });
      }
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getPrNumber(): number | undefined {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
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
