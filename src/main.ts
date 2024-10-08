import * as core from '@actions/core'
import * as github from '@actions/github'
// eslint-disable-next-line import/no-unresolved
import {PullRequestEvent, PushEvent} from '@octokit/webhooks-definitions/schema'

import {fetchWithDepth, getChangedFiles, revParse} from './git'
import {parseRules} from './rule'

async function run(): Promise<void> {
  try {
    const rules = parseRules(core.getInput('filters'))
    let baseSha
    let headSha

    switch (github.context.eventName) {
      case 'push': {
        const event = github.context.payload as PushEvent
        headSha = event.after
        if (event.deleted) {
          // do not emit any changed files when a branch is deleted
          return
        }
        if (event.created) {
          // new branch has no "before" SHA, so we compare it to the default branch
          await fetchWithDepth(event.repository.default_branch)
          baseSha = await revParse(`origin/${event.repository.default_branch}`)
        } else if (event.forced) {
          // the old commit won't be present in our normal clone
          baseSha = event.before
        } else {
          baseSha = event.before
        }
        break
      }
      case 'pull_request': {
        const event = github.context.payload as PullRequestEvent
        baseSha = event.pull_request.base.sha
        headSha = event.pull_request.head.sha
        break
      }
      default: {
        core.error(`Don't know how to handle ${github.context.eventName} event`)
        return
      }
    }

    core.debug(`baseSha: ${baseSha}`)
    core.debug(`headSha: ${headSha}`)

    await fetchWithDepth(baseSha, 10)
    await fetchWithDepth(headSha, 10)
    const changedFiles = await getChangedFiles(baseSha, headSha)
    core.debug(`changedFiles: ${changedFiles}`)
    for (const rule of rules) {
      const matchedFiles = rule.filter(changedFiles)
      const changed = matchedFiles.length > 0 ? 'true' : 'false'
      core.debug(`rule: ${rule.name}, changed: ${changed}`)
      core.setOutput(rule.name, changed)
      core.setOutput(`${rule.name}_files`, matchedFiles.join(' '))
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

run()
