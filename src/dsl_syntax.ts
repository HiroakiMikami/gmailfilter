import * as $ from "./dsl"

/* DSL */
class MatchDSL extends $.Match {
    public Case(cond: $.CondCase | string | number, body: $.Body) {
        const cases = Array.from(this.caseBlock)
        if (cond instanceof $.CondCase) {
            cases.push(new $.Case(cond, body))
        } else {
            cases.push(new $.Case(new $.CondCase($.PredicateWithKey.Is, cond), body))
        }
        return new MatchDSL(this.key, cases, null)
    }
    public Otherwise(body: $.Body) {
        return new $.Match(this.key, this.caseBlock, new $.Otherwise(body))
    }
}
class IfDSL extends $.If {
    public Elif(cond: $.CondIf, body: $.Body) {
        const elif = Array.from(this.elifBlock)
        elif.push(new $.Elif(cond, body))
        return new IfDSL(this.cond, this.body, elif, null)
    }
    public Else(body: $.Body) {
        return new $.If(this.cond, this.body, this.elifBlock, new $.Else(body))
    }
}
class KeyDSL extends $.Key {
    public Larger(value: string | number) {
        return new $.CondIfWithKey(this, $.PredicateWithKey.Larger, value)
    }
    public Smaller(value: string | number) {
        return new $.CondIfWithKey(this, $.PredicateWithKey.Smaller, value)
    }
    public Is(value: string | number) {
        return new $.CondIfWithKey(this, $.PredicateWithKey.Is, value)
    }
}

export function Match(key: $.Key) {
    return new MatchDSL(key, [], null)
}
export function If(cond: $.CondIf, body: $.Body) {
        return new IfDSL(cond, body, [], null)
    }
export function K(name: string) {
    return new KeyDSL(name)
}

export function Is(value: string) {
    return new $.CondIfWithoutKey($.PredicateWithoutKey.Is, value)
}
export function In(value: string) {
    return new $.CondIfWithoutKey($.PredicateWithoutKey.In, value)
}
export function Has(value: string) {
    return new $.CondIfWithoutKey($.PredicateWithoutKey.Has, value)
}

export function Larger(value: string | number) {
    return new $.CondCase($.PredicateWithKey.Larger, value)
}
export function Smaller(value: string | number) {
    return new $.CondCase($.PredicateWithKey.Smaller, value)
}
export function Not(value: $.CondIf): $.CondIf
export function Not(value: string | number | $.CondCase): $.CondCase
export function Not(value: string | number | $.CondCase | $.CondIf) {
    if (value instanceof $.CondIfWithKey) {
        return new $.CondIfWithKey(value.key, value.predicate, value.value, !value.not)
    } else if (value instanceof $.CondIfWithoutKey) {
        return new $.CondIfWithoutKey(value.predicate, value.value, !value.not)
    } else if (value instanceof $.CondCase) {
        return new $.CondCase(value.predicate, value.value, !value.not)
    } else {
        return new $.CondCase($.PredicateWithKey.Is, value, true)
    }
}
