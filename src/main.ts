import * as core from '@actions/core'
import * as github from '@actions/github'
// eslint-disable-next-line import/no-unresolved
import {PullRequestEvent, PushEvent} from '@octokit/webhooks-definitions/schema'

import {getChangedFiles, unshallow} from './git'
import {parseRules} from './rule'

async function run(): Promise<void> {
  let changedFiles: string[]
  try {
    switch (github.context.eventName) {
      case 'push': {
        const event = github.context.payload as PushEvent
        const files = new Set<string>()
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(event, null, 2))
        for (const commit of event.commits) {
          for (const key of ['added', 'modified', 'removed'] as const) {
            const fileList = commit[key]
            if (!Array.isArray(fileList)) {
              core.warning(`${commit.id} commit.${key} is not an array`)
              continue
            }
            for (const file of fileList) {
              files.add(file)
            }
          }
        }
        changedFiles = Array.from(files)
        break
      }
      case 'pull_request': {
        const event = github.context.payload as PullRequestEvent
        const baseSha = event.pull_request.base.sha
        const headSha = event.pull_request.head.sha
        await unshallow()
        core.debug(`baseSha: ${baseSha}`)
        core.debug(`headSha: ${headSha}`)
        changedFiles = await getChangedFiles(baseSha, headSha)
        break
      }
      default: {
        core.error(`Don't know how to handle ${github.context.eventName} event`)
        return
      }
    }

    const rules = parseRules(core.getInput('filters'))
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
