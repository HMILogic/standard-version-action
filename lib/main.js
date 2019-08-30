"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const child_process_1 = require("child_process");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('repo-token', { required: true });
            const client = new github.GitHub(token);
            const pullRequest = yield getPullRequest(client);
            if (!pullRequest) {
                console.log('Could not get pull request number from context, exiting');
                console.log(JSON.stringify(github.context, null, 2));
                return;
            }
            const script = child_process_1.exec('./node_modules/.bin/standard-version --dry-run --skip.commit --skip.tag');
            if (!script.stdout)
                return;
            script.stdout.on('data', data => {
                const changelog = /\-{3}(.+?)\-{3}/s;
                const matches = data.match(changelog);
                if (matches) {
                    const changelog = matches[1].trim();
                    const labels = [];
                    if (changelog.match('### Feature'))
                        labels.push('Type: Feature');
                    if (changelog.match('### Bug Fixes'))
                        labels.push('Type: Bug Fix');
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
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function getPullRequest(client) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield client.graphql(`
      {
        repository(owner: $owner, name: $name) {
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
    `, {
            owner: github.context.repo.owner,
            name: github.context.repo.repo,
            ref: github.context.ref,
        });
        let pullRequest = undefined;
        if (response.data.repository && response.data.repository.ref) {
            pullRequest = response.data.repository.ref.associatedPullRequests.nodes.find(pr => {
                return pr.commits.nodes.find(commit => commit.commit.oid === github.context.sha);
            });
        }
        if (!pullRequest) {
            return undefined;
        }
        return pullRequest;
    });
}
function addLabels(client, prNumber, labels) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.issues.addLabels({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: prNumber,
            labels: labels,
        });
    });
}
run();
