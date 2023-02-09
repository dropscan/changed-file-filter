import {exec} from '@actions/exec'

async function execForStdOut(
  commandLine: string,
  args?: string[],
  cwd?: string
): Promise<string> {
  let stdout = ''
  await exec(commandLine, args, {
    cwd,
    listeners: {
      stdout: buffer => {
        stdout = buffer.toString()
      }
    }
  })
  return stdout
}

async function getMergeBase(
  shaA: string,
  shaB: string,
  cwd?: string
): Promise<string> {
  const maxLoops = 10
  const depthPerLoop = 15
  for (let i = 0; i < maxLoops; i++) {
    // iteratively deepen the local checkout until the merge-base is found
    try {
      return execForStdOut('git', ['merge-base', shaA, shaB], cwd)
    } catch (error) {
      exec(
        'git',
        ['fetch', '--deepen', depthPerLoop.toString(), 'origin', shaA, shaB],
        {cwd}
      )
    }
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

export async function fetchOne(ref: string): Promise<number> {
  return exec('git', ['fetch', '--depth', '1', 'origin', ref])
}
