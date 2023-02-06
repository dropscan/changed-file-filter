import {filter} from 'minimatch'
import {safeLoad} from 'js-yaml'

export class Rule {
  name: string
  patterns: string[]

  private predicates: ((p: string) => boolean)[]

  constructor(name: string, patterns: string[]) {
    this.name = name
    this.patterns = patterns
    this.predicates = patterns.map(pattern => filter(pattern))
  }

  matches(filename: string): boolean {
    return this.predicates.some(p => p(filename))
  }

  filter(filenames: string[]): string[] {
    return filenames.filter(filename => this.matches(filename))
  }
}

export function parseRules(rule: string): Rule[] {
  const rules = safeLoad(rule)
  if (typeof rules !== 'object') {
    throw new Error('expect an map')
  }
  return Object.entries(rules).map(([name, value]) => {
    if (!Array.isArray(value)) {
      throw new Error(`expected an array of strings at ${name}`)
    }
    // check if each element is a string
    if (!value.every(x => typeof x === 'string')) {
      throw new Error('expect an array of strings at ${name}')
    }
    return new Rule(name, value)
  })
}
