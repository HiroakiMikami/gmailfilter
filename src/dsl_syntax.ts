import * as $ from "./dsl"

class PrimitiveAroundDSL extends $.PrimitiveAround {
    public Within(nwords: number) {
        return new $.PrimitiveAround(this.word1, this.word2, nwords)
    }
}
export function Around(word1: string, word2: string) {
    return new PrimitiveAroundDSL(word1, word2)
}

class MatchDSL extends $.Match {
    public Case(pattern: $.Primitive | $.Pattern, ...body: $.Body) {
        const caseBlocks = Array.from(this.caseBlocks)
        if ($.isPattern(pattern)) {
            caseBlocks.push(new $.Case(pattern, body))
        } else {
            caseBlocks.push(new $.Case(new $.PatternPrimitive(pattern), body))
        }
        return new MatchDSL(this.key, caseBlocks)
    }
    public Otherwise(...body: $.Body) {
        return new $.Match(this.key, this.caseBlocks, new $.Otherwise(body))
    }
}
export function Match(key: $.Key) {
    return new MatchDSL(key, [])
}

class KeyDSL extends $.Key {
    public Contains(value: $.Primitive) {
        return new $.CondKey($.Predicate.Contains, value, this)
    }
}
export function K(key: string) {
    return new KeyDSL(key)
}
export const to = K("to")
export const from = K("from")
export const subject = K("subject")
export const cc = K("cc")
export const bcc = K("bcc")
export const list = K("list")
export const deliveredto = K("deliveredto")
export const Rfc822msgid = K("Rfc822msgid")

class IfDSL extends $.If {
    public Elif(cond: $.Cond, ...body: $.Body) {
        const elifBlock = Array.from(this.elifBlocks)
        elifBlock.push(new $.Elif(cond, body))
        return new IfDSL(this.cond, this.body, elifBlock)
    }
    public Else(...body: $.Body) {
        return new IfDSL(this.cond, this.body, this.elifBlocks, new $.Else(body))
    }
}
export function If(cond: $.Cond, ...body: $.Body)  {
    return new IfDSL(cond, body, [])
}

export class Mail {
    public static Contains(value: $.Primitive) {
        return new $.CondMail($.Predicate.Contains, value)
    }
    public static Larger(value: $.Primitive) {
        return new $.CondMail($.Predicate.Larger, value)
    }
    public static Smaller(value: $.Primitive) {
        return new $.CondMail($.Predicate.Smaller, value)
    }
    public static After(value: $.Primitive) {
        return new $.CondMail($.Predicate.After, value)
    }
    public static Before(value: $.Primitive) {
        return new $.CondMail($.Predicate.Before, value)
    }
    public static Older(value: $.Primitive) {
        return new $.CondMail($.Predicate.Older, value)
    }
    public static Newer(value: $.Primitive) {
        return new $.CondMail($.Predicate.Newer, value)
    }
    public static OlderThan(value: $.Primitive) {
        return new $.CondMail($.Predicate.OlderThan, value)
    }
    public static NewerThan(value: $.Primitive) {
        return new $.CondMail($.Predicate.NewerThan, value)
    }
    public static Is(value: $.Primitive) {
        return new $.CondMail($.Predicate.Is, value)
    }
    public static In(value: $.Primitive) {
        return new $.CondMail($.Predicate.In, value)
    }
    public static Has(value: $.Primitive) {
        return new $.CondMail($.Predicate.Has, value)
    }
}

export function Not(cond: $.Cond): $.Cond
export function Not(pattern: $.Primitive | $.Pattern): $.Pattern
export function Not(value: $.Primitive | $.Pattern | $.Cond): $.Pattern | $.Cond {
    if ($.isCond(value)) {
        return new $.CondUniaryOperator(value, $.UniaryOperator.Not)
    } else if ($.isPattern(value)) {
        return new $.PatternUniaryOperator(value, $.UniaryOperator.Not)
    } else {
        return new $.PatternUniaryOperator(new $.PatternPrimitive(value), $.UniaryOperator.Not)
    }
}
export function And(...cond: ReadonlyArray<$.Cond>): $.Cond
export function And(...pattern: ReadonlyArray<$.Primitive | $.Pattern>): $.Pattern
export function And(
        ...values: ReadonlyArray<$.Primitive | $.Pattern> | ReadonlyArray<$.Cond>
    ): $.Pattern | $.Cond {
    if (values.some($.isCond)) {
        return new $.CondMultiaryOperator(values as ReadonlyArray<$.Cond>, $.MultiaryOperator.And)
    } else {
        return new $.PatternMultiaryOperator((values as ReadonlyArray<$.Primitive | $.Pattern>).map((x) => {
            if ($.isPattern(x)) {
                return x
            } else {
                return new $.PatternPrimitive(x)
            }
        }), $.MultiaryOperator.And)
    }
}
export function Or(...cond: ReadonlyArray<$.Cond>): $.Cond
export function Or(...pattern: ReadonlyArray<$.Primitive | $.Pattern>): $.Pattern
export function Or(
        ...values: ReadonlyArray<$.Primitive | $.Pattern> | ReadonlyArray<$.Cond>
    ): $.Pattern | $.Cond {
    if (values.some($.isCond)) {
        return new $.CondMultiaryOperator(values as ReadonlyArray<$.Cond>, $.MultiaryOperator.Or)
    } else {
        return new $.PatternMultiaryOperator((values as ReadonlyArray<$.Primitive | $.Pattern>).map((x) => {
            if ($.isPattern(x)) {
                return x
            } else {
                return new $.PatternPrimitive(x)
            }
        }), $.MultiaryOperator.Or)
    }
}
