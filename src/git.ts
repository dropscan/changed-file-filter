import {exec, getExecOutput} from '@actions/exec'

async function execForStdOut(
  command: string,
  args?: string[],
  cwd?: string
): Promise<string> {
  const output = await getExecOutput(command, args, {
    cwd,
    ignoreReturnCode: false
  })
  return output.stdout
}

async function getMergeBase(
  shaA: string,
  shaB: string,
  cwd?: string
): Promise<string> {
  const maxLoops = 10
  const depthPerLoop = 50

  // iteratively deepen the local checkout until a merge-base is found
  for (let i = 1; i <= maxLoops; i++) {
    const output = await getExecOutput('git', ['merge-base', shaA, shaB], {
      cwd,
      ignoreReturnCode: true
    })
    if (output.exitCode === 0) {
      return output.stdout
    }
    await fetchWithDepth(shaA, depthPerLoop * i)
    await fetchWithDepth(shaB, depthPerLoop * i)
  }
  const totalCommits = maxLoops * depthPerLoop
  throw new Error(
    `No merge base between ${shaA} and ${shaB} within last ${totalCommits} commits`
  )
}

export async function getChangedFiles(
  baseSha: string,
  headSha: string,
  cwd?: string
): Promise<string[]> {
  const mergeBase = (await getMergeBase(baseSha, headSha, cwd)).trim()
  return (
    await execForStdOut(
      'git',
      ['diff', '--name-only', `${mergeBase}..${headSha}`, '--'],
      cwd
    )
  )
    .split('\n')
    .map(x => x.trim())
    .filter(x => x.length > 0)
}

export async function revParse(rev: string, cwd?: string): Promise<string> {
  const output = await execForStdOut('git', ['rev-parse', rev], cwd)
  return output.trim()
}

export async function fetchWithDepth(ref: string, depth = 1): Promise<number> {
  return exec('git', ['fetch', '--depth', depth.toString(), 'origin', ref])
}
