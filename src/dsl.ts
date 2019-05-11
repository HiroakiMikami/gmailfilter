import * as google from "googleapis"

/*
 * Privmitive := <str> | <number> | around <str> <str> within <number>
 * Filter     := Match | If
 * Expression := Action | Filter
 * Body       := Expression*
 * Match      := match Key Case+ [Otherwise]
 * Case       := case Pattern Body
 * Otherwise  := otherwise Body
 * Key        := to | from | subject | cc | bcc | list | deliveredto | Rfc822msgid | K <str>
 * Pattern    := Primitive | not Pattern | and Pattern+ | or Pattern+
 * If         := if Cond Body [Elif*] [Else*]
 * Elif       := elif Cond Body
 * Else       := else Body
 * Cond       := CondMail | CondKey | not Cond | and Cond+ | or Cond+
 * CondKey    := Key contains Primitive
 * CondMail   := main contains Primitive |
 *               mail larger Primitive | mail smaller Primitive |
 *               mail after Primitive | mail before Primitive |
 *               mail older Primitive | mail newer Primitive
 *               mail older_than Primitive | mail newer_than Primitive |
 *               mail is Primitive | mail in Primitive | mail has Primitive
 */

export enum UniaryOperator {
    Not,
}
export enum MultiaryOperator {
    And, Or,
}

export type Primitive = string | number | PrimitiveAround
export function isPrimitive(prim: any): prim is Primitive {
    if (typeof prim === "string" || typeof prim === "number") {
        return true
    } else if (prim instanceof PrimitiveAround) {
        return true
    }
    return false
}
export class PrimitiveAround {
    constructor(
        public readonly word1: string,
        public readonly word2: string,
        public readonly nwords?: number) {}
}
export type Action = google.gmail_v1.Schema$FilterAction

export type Filter = Match | If
export type Expression = Action | Filter
export type Body = ReadonlyArray<Expression>

export class Match {
    constructor(
        public readonly key: Key,
        public readonly caseBlocks: ReadonlyArray<Case>,
        public readonly otherwiseBlock?: Otherwise) {}
}
export class Case {
    constructor(public readonly pattern: Pattern, public readonly body: Body) {}
}
export class Otherwise {
    constructor(public readonly body: Body) {}
}
export class Key {
    constructor(public readonly name: string) {}
}

export type Pattern = PatternPrimitive | PatternUniaryOperator | PatternMultiaryOperator
export function isPattern(pattern: any): pattern is Pattern {
    return pattern instanceof PatternPrimitive ||
           pattern instanceof PatternUniaryOperator ||
           pattern instanceof PatternMultiaryOperator
}
export class PatternPrimitive {
    constructor(public readonly value: Primitive) {}
}
export class PatternUniaryOperator {
    constructor(
        public readonly value: Pattern,
        public readonly operator: UniaryOperator) {}
}
export class PatternMultiaryOperator {
    constructor(
        public readonly values: ReadonlyArray<Pattern>,
        public readonly operator: MultiaryOperator) {}
}
export class If {
    constructor(
        public readonly cond: Cond,
        public readonly body: Body,
        public readonly elifBlocks: ReadonlyArray<Elif>,
        public readonly elseBlock?: Else) {}
}
export class Elif {
    constructor(
        public readonly cond: Cond,
        public readonly body: Body) {}
}
export class Else {
    constructor(public readonly body: Body) {}
}
export type Cond = CondMail | CondKey | CondUniaryOperator | CondMultiaryOperator
export function isCond(cond: any): cond is Cond {
    return cond instanceof CondMail ||
           cond instanceof CondKey ||
           cond instanceof CondUniaryOperator ||
           cond instanceof CondMultiaryOperator
}

export enum Predicate {
    Contains = "contains", Has = "has", Larger = "larger", Smaller = "smaller",
    After = "after", Before = "before", Older = "older", Newer = "newer",
    OlderThan = "older_than", NewerThan = "newer_than", Is = "is", In = "in",
}
export class CondMail {
    constructor(
        public readonly pred: Predicate,
        public readonly value: Primitive) {}
}
export class CondKey {
    constructor(
        public readonly pred: Predicate,
        public readonly value: Primitive,
        public readonly key: Key) {}
}
export class CondUniaryOperator {
    constructor(
        public readonly cond: Cond,
        public readonly operator: UniaryOperator) {}
}
export class CondMultiaryOperator {
    constructor(
        public readonly conds: ReadonlyArray<Cond>,
        public readonly operator: MultiaryOperator) {}
}

export function stringify(pred: Predicate | Primitive): string {
    if (pred instanceof PrimitiveAround) {
        if (pred.nwords) {
            return `${pred.word1} AROUND ${pred.nwords} ${pred.word2}`
        } else {
            return `${pred.word1} AROUND ${pred.word2}`
        }
    } else {
        return `${pred}`
    }
}

export type Query = string | QueryUniaryOperator | QueryMultiaryOperator
export class QueryUniaryOperator {
    constructor(public readonly query: Query, public readonly operator: UniaryOperator) {}
}
export class QueryMultiaryOperator {
    constructor(
        public readonly queries: ReadonlyArray<Query>,
        public readonly operator: MultiaryOperator) {}
}

export function toQuery(cond: Cond): Query
export function toQuery(cond: Pattern, key: Key): Query
export function toQuery(cond: Cond | Pattern, key?: Key): Query {
    if (isCond(cond)) {
        if (cond instanceof CondKey) {
            return `${cond.key.name}:"${stringify(cond.value)}"`
        } else if (cond instanceof CondMail) {
            if (cond.pred === Predicate.Contains) {
                return `"${stringify(cond.value)}"`
            } else {
                return `${stringify(cond.pred)}:"${stringify(cond.value)}"`
            }
        } else if (cond instanceof CondUniaryOperator) {
            return new QueryUniaryOperator(toQuery(cond.cond), cond.operator)
        } else if (cond instanceof CondMultiaryOperator) {
            return new QueryMultiaryOperator(cond.conds.map(toQuery), cond.operator)
        }
    } else {
        if (cond instanceof PatternPrimitive) {
            return `${key.name}:"${stringify(cond.value)}"`
        } else if (cond instanceof PatternUniaryOperator) {
            return new QueryUniaryOperator(toQuery(cond.value, key), cond.operator)
        } else if (cond instanceof PatternMultiaryOperator) {
            return new QueryMultiaryOperator(
                cond.values.map((x) => toQuery(x, key)),
                cond.operator)
        }
    }
    return ""
}

export type Criteria = google.gmail_v1.Schema$FilterCriteria
export function toCriteria(query: Query): Criteria {
    if (query instanceof QueryUniaryOperator) {
        if (query.operator === UniaryOperator.Not) {
            const q = toCriteria(query.query)
            return { query: `(NOT ${q.query})` }
        }
    } else if (query instanceof QueryMultiaryOperator) {
        const qs = query.queries.map(toCriteria).map((x) => x.query)
        if (query.operator === MultiaryOperator.And) {
            return { query: `(${qs.join(" ")})`}
        } else if (query.operator === MultiaryOperator.Or) {
            return { query: `(${qs.join(" OR ")})`}
        }
    } else {
        return { query }
    }
    return {}
}

export class EvaluationError extends Error {
    constructor(message: string) {
        super(message)
    }
}
export function evaluate(f: Filter): google.gmail_v1.Schema$Filter[] {
    function evaluateBody(body: Body, query: ReadonlyArray<Query>): Array<{ query: Query, action: Action}> {
        const filters = []
        for (const exp of body) {
            if (exp instanceof If || exp instanceof Match) {
                const fs = _evaluate(exp)
                for (const x of fs) {
                    filters.push({
                        action: x.action,
                        query: new QueryMultiaryOperator([...query, x.query], MultiaryOperator.And),
                    })
                }
            } else {
                filters.push({
                    action: exp,
                    query: new QueryMultiaryOperator([...query], MultiaryOperator.And),
                })
            }
        }
        return filters
    }
    function _evaluate(filter: Filter): Array<{ query: Query, action: Action}> {
        const filters: Array<{ query: Query, action: Action}> = []

        if (filter instanceof If) {
            const qs: Query[] = []

            // If-Elif
            const elifs = Array.from(filter.elifBlocks)
            elifs.unshift(new Elif(filter.cond, filter.body))
            for (const elif of elifs) {
                const query = toQuery(elif.cond)
                for (const x of evaluateBody(elif.body, [...qs, query])) {
                    filters.push(x)
                }

                qs.push(new QueryUniaryOperator(query, UniaryOperator.Not))
            }

            // Else
            if (filter.elseBlock) {
                for (const x of evaluateBody(filter.elseBlock.body, qs)) {
                    filters.push(x)
                }
            }
        } else {
            if (filter.caseBlocks.length === 0) {
                throw new EvaluationError("There is not case block in Match expression")
            }
            const qs: Query[] = []

            // Case
            for (const ca of filter.caseBlocks) {
                const query = toQuery(ca.pattern, filter.key)
                qs.push(new QueryUniaryOperator(query, UniaryOperator.Not))

                for (const x of evaluateBody(ca.body, [query])) {
                    filters.push(x,
                        )
                }
            }

            // Otherwise
            if (filter.otherwiseBlock) {
                for (const x of evaluateBody(filter.otherwiseBlock.body, qs)) {
                    filters.push(x)
                }
            }
        }

        // split addLabelIds
        const retval = []
        for (const x of filters) {
            if (x.action.addLabelIds) {
                x.action.addLabelIds.forEach((label, index) => {
                    if (index === 0) {
                        retval.push({
                            action: {
                                addLabelIds: [label],
                                removeLabelIds: x.action.removeLabelIds,
                            },
                            query: x.query,
                        })
                    } else {
                        retval.push({
                            action: { addLabelIds: [label] },
                            query: x.query,
                        })
                    }
                })
            } else {
                retval.push(x)
            }
        }
        return retval
    }

    return _evaluate(f).map((x) => {
        return { action: x.action, criteria: toCriteria(x.query) }
    })
}
