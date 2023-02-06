import {parseRules, Rule} from '../src/rule'
import fs from 'fs'

/**
 * @group unit
 */
describe('parseRules', () => {
  it('parses yaml', () => {
    const ruleYaml = fs.readFileSync('testdata/rules.yaml')
    const rules = parseRules(ruleYaml.toString())
    expect(rules).toMatchObject([
      {
        name: 'go',
        patterns: ['**/*.go']
      },
      {
        name: 'js',
        patterns: ['**/*.ts']
      },
      {
        name: 'build',
        patterns: ['**/Dockerfile', '**/bazel.BUILD', '**/BUILD']
      }
    ])
  })

  it('throws an error if rule is not a string array', () => {
    expect(() => {
      parseRules(`
go:
  - 1
`)
    }).toThrow()
    expect(() => {
      parseRules(`
go:
  name: helloworld`)
    }).toThrow()
  })
})

describe('Rule.matches', () => {
  interface GlobberTestCase {
    globRules: string[]
    expectedMatches: [string, boolean][]
  }
  const testCases: GlobberTestCase[] = [
    {
      globRules: ['**/*.go', '__tests__/**/*.test.ts'],
      expectedMatches: [
        ['main.go', true],
        ['deep/main.go', true],
        ['shallow.ts', false],
        ['__tests__/main.ts', false],
        ['__tests__/main.test.ts', true]
      ]
    },
    {
      globRules: ['BUILD', '**/BUILD.bazel'],
      expectedMatches: [
        ['BUILD', true],
        ['src/BUILD.bazel', true],
        ['src/pkg/BUILD.bazel', true],
        ['src/BUILD', false],
        ['BUILD.bazel', true]
      ]
    },
    {
      globRules: ['src/**/*'],
      expectedMatches: [
        ['file', false],
        ['src/file', true],
        ['src/nested/file', true]
      ]
    }
  ]
  it('matches paths correclty', () => {
    for (const testCase of testCases) {
      const rule = new Rule('', testCase.globRules)
      for (const [input, match] of testCase.expectedMatches) {
        const testMessage = `${input} ${match ? 'should' : "shouldn't"} match ${
          testCase.globRules
        }`
        expect(rule.matches(input), testMessage).toEqual(match)
      }
    }
  })
})
