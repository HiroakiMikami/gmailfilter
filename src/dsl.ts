import * as google from "googleapis"

/*
 * Filter        := Match | If
 * Expression    := Action | Filter
 * Body          := Expression | Expression*
 * Match         := match Key Case* [Otherwise]
 * Case          := case CaseCond Body
 * Otherwise     := otherwise Body
 * CaseCond      := larger <v> | smaller <v> | <v> | not CaseCond
 * If            := if CondIf Body [Elif*] [Else]
 * Elif          := elif CondIf Body
 * Else          := else Body
 * CondIf        := Key larger <v> | Key smaller <v> | Key is <v> | is <value> | has <value> | not CondIf
 * Key           := k(<str>)
 */

export enum PredicateWithKey {
    Larger, Smaller, Is,
}
export enum PredicateWithoutKey {
    In, Is, Has,
}
export type Action = google.gmail_v1.Schema$FilterAction

export type Filter = Match | If
export type Expression = Action | Filter
export class Match {
    constructor(public key: Key, public caseBlock: ReadonlyArray<Case>, public otherwiseBlock: Otherwise | null) {}
}
export class Case {
    constructor(public cond: CondCase, public body: ReadonlyArray<Expression>) {}
}
export class Otherwise {
    constructor(public body: ReadonlyArray<Expression>) {}
}
export class CondCase {
    constructor(public predicate: PredicateWithKey, public value: number | string, public not: boolean = false) {}
}

export class If {
    constructor(public cond: CondIf, public body: ReadonlyArray<Expression>,
                public elifBlock: ReadonlyArray<Elif>, public elseBlock: Else | null) {}
}
export class Elif {
    constructor(public cond: CondIf, public body: ReadonlyArray<Expression>) {}
}
export class Else {
    constructor(public body: ReadonlyArray<Expression>) {}
}
export type CondIf = CondIfWithKey | CondIfWithoutKey
export class CondIfWithKey {
    constructor(public key: Key, public predicate: PredicateWithKey,
                public value: number | string, public not: boolean = false) {}
}
export class CondIfWithoutKey {
    constructor(public predicate: PredicateWithoutKey, public value: string, public not: boolean = false) {}
}
export class Key {
    constructor(public keyName: string) {}
}

export class EvaluationError extends Error {
    constructor(message: string) {
        super(message)
    }
}

export namespace PredicateWithKey {
    export function stringify(predicate: PredicateWithKey): string {
        if (predicate === PredicateWithKey.Is) {
            return ""
        } else if (predicate === PredicateWithKey.Larger) {
            return "larger"
        } else if (predicate === PredicateWithKey.Smaller) {
            return "smaller"
        }
        throw new EvaluationError(`Invalid value (${predicate}) to PredicateWithKey#stringify`)
    }
}
export namespace PredicateWithoutKey {
    export function stringify(predicate: PredicateWithoutKey): string {
        if (predicate === PredicateWithoutKey.Is) {
            return "is"
        } else if (predicate === PredicateWithoutKey.In) {
            return "in"
        } else if (predicate === PredicateWithoutKey.Has) {
            return "has"
        }
        throw new EvaluationError(`Invalid value (${predicate}) to PredicateWithoutKey#stringify`)
    }
}
export function toQuery(cond: CondIf): string
export function toQuery(cond: CondCase, key: Key): string
export function toQuery(cond: CondIf | CondCase, key?: Key): string {
    if (cond instanceof CondIfWithKey) {
        if (cond.predicate === PredicateWithKey.Is) {
            return `${cond.key.keyName}:"${cond.value}"`
        } else {
            if (cond.key.keyName !== "size") {
                throw new EvaluationError(`Larger|Smaller is not used with ${cond.key.keyName} key`)
            }
            return `${PredicateWithKey.stringify(cond.predicate)}:${cond.value}`
        }
    } else if (cond instanceof CondIfWithoutKey) {
        return `${PredicateWithoutKey.stringify(cond.predicate)}:${cond.value}`
    } else {
        if (cond.predicate === PredicateWithKey.Is) {
            return `${key.keyName}:"${cond.value}"`
        } else {
            if (key.keyName !== "size") {
                throw new EvaluationError(`Larger|Smaller is not used with ${key.keyName} key`)
            }
            return `${PredicateWithKey.stringify(cond.predicate)}:${cond.value}`
        }
    }
}
export function toCriteria(cond: CondIf): google.gmail_v1.Schema$FilterCriteria
export function toCriteria(cond: CondCase, key: Key): google.gmail_v1.Schema$FilterCriteria
export function toCriteria(cond: CondIf | CondCase, key?: Key): google.gmail_v1.Schema$FilterCriteria {
    let query = ""
    if (cond instanceof CondCase) {
        query = toQuery(cond, key)
    } else {
        query = toQuery(cond)
    }
    if (cond.not) {
        return { negatedQuery: query }
    } else  {
        return { query }
    }
}
export namespace Criteria {
    export function not(criteria: google.gmail_v1.Schema$FilterCriteria): google.gmail_v1.Schema$FilterCriteria {
        const retval: google.gmail_v1.Schema$FilterCriteria = {}
        if (criteria.negatedQuery) {
            retval.query = criteria.negatedQuery
        }
        if (criteria.query) {
            retval.negatedQuery = criteria.query
        }
        return retval
    }
    export function merge(
        criterias: ReadonlyArray<google.gmail_v1.Schema$FilterCriteria>): google.gmail_v1.Schema$FilterCriteria {
        const retval: google.gmail_v1.Schema$FilterCriteria = {}
        for (const criteria of criterias) {
            if (criteria.query) {
                if (!retval.query) {
                    retval.query = criteria.query
                } else {
                    retval.query += ` ${criteria.query}`
                }
            }
            if (criteria.negatedQuery) {
                if (!retval.negatedQuery) {
                    retval.negatedQuery = criteria.negatedQuery
                } else {
                    retval.negatedQuery += ` ${criteria.negatedQuery}`
                }
            }
        }
        return retval
    }
}
export function evaluateBody(body: ReadonlyArray<Expression>, c: google.gmail_v1.Schema$FilterCriteria) {
    const filters = []
    for (const exp of body) {
        if (exp instanceof If || exp instanceof Match) {
            const fs = evaluate(exp)
            for (const f of fs) {
                filters.push({
                    action: f.action,
                    criteria: Criteria.merge([c, f.criteria]),
                })
            }
        } else {
            filters.push({
                action: exp,
                criteria: c,
            })
        }
    }
    return filters
}
export function evaluate(filter: Filter): google.gmail_v1.Schema$Filter[] {
    const filters: google.gmail_v1.Schema$Filter[] = []

    if (filter instanceof If) {
        let c: google.gmail_v1.Schema$FilterCriteria = {}

        // If-Elif
        const elifs = Array.from(filter.elifBlock)
        elifs.unshift(new Elif(filter.cond, filter.body))
        for (const elif of elifs) {
            const criteria = toCriteria(elif.cond)
            const c1 = Criteria.merge([c, criteria])
            c = Criteria.merge([c, Criteria.not(criteria)])

            for (const f of evaluateBody(elif.body, c1)) {
                filters.push(f)
            }
        }

        // Else
        if (filter.elseBlock) {
            for (const f of evaluateBody(filter.elseBlock.body, c)) {
                filters.push(f)
            }
        }
    } else {
        if (filter.caseBlock.length === 0) {
            throw new EvaluationError("There is not case block in Match expression")
        }
        let c: google.gmail_v1.Schema$FilterCriteria = {}

        // Case
        for (const ca of filter.caseBlock) {
            const criteria = toCriteria(ca.cond, filter.key)
            c = Criteria.merge([c, Criteria.not(criteria)])

            for (const f of evaluateBody(ca.body, criteria)) {
                filters.push(f)
            }
        }

        // Otherwise
        if (filter.otherwiseBlock) {
            for (const f of evaluateBody(filter.otherwiseBlock.body, c)) {
                filters.push(f)
            }
        }
    }
    return filters
}
