import * as core from '@actions/core'
import * as github from '@actions/github'
// eslint-disable-next-line import/no-unresolved
import {PullRequestEvent, PushEvent} from '@octokit/webhooks-definitions/schema'

import {getChangedFiles, unshallow} from './git'
import {parseRules} from './rule'

async function run(): Promise<void> {
  try {
    let baseSha
    let headSha

    switch (github.context.eventName) {
      case 'push': {
        const event = github.context.payload as PushEvent
        baseSha = event.before
        headSha = event.after
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

    await unshallow()
    core.debug(`baseSha: ${baseSha}`)
    core.debug(`headSha: ${headSha}`)

    const rules = parseRules(core.getInput('filters'))
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
