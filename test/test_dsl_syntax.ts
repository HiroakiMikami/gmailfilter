import * as chai from "chai"
chai.should()

import * as $ from "../src/dsl"
import { And, Around, bcc, cc, deliveredto, from,
         If, K, list, Mail, Match, Not, Or, Rfc822msgid, subject, to } from "../src/dsl_syntax"

describe("DSL syntax", () => {
    describe("Primitive", () => {
        it("create an instance of PrimitiveAround", () => {
            Around("w1", "w2").should.deep.equal(new $.PrimitiveAround("w1", "w2"))
            Around("w1", "w2").Within(1).should.deep.equal(new $.PrimitiveAround("w1", "w2", 1))
        })
        it("create an instance of Key", () => {
            K("key").should.deep.equal(new $.Key("key"))
        })
        it("define keys", () => {
            to.should.deep.equal(K("to"))
            from.should.deep.equal(K("from"))
            subject.should.deep.equal(K("subject"))
            cc.should.deep.equal(K("cc"))
            bcc.should.deep.equal(K("bcc"))
            list.should.deep.equal(K("list"))
            deliveredto.should.deep.equal(K("deliveredto"))
            Rfc822msgid.should.deep.equal(K("Rfc822msgid"))
        })
        it("create an instance of Pattrns", () => {
            Not("p").should.deep.equal(
                new $.PatternUniaryOperator(new $.PatternPrimitive("p"), $.UniaryOperator.Not))
            And(Not("p"), "x").should.deep.equal(new $.PatternMultiaryOperator([
                new $.PatternUniaryOperator(new $.PatternPrimitive("p"), $.UniaryOperator.Not),
                new $.PatternPrimitive("x"),
            ], $.MultiaryOperator.And))
            Or(Not("p"), "x").should.deep.equal(new $.PatternMultiaryOperator([
                new $.PatternUniaryOperator(new $.PatternPrimitive("p"), $.UniaryOperator.Not),
                new $.PatternPrimitive("x"),
            ], $.MultiaryOperator.Or))
        })
        it("create instances of Match", () => {
            Match(to)
                .Case("value", {})
            .should.deep.equal(
                new $.Match(to, [new $.Case(new $.PatternPrimitive("value"), [{}])]))
            Match(to)
                .Case("value", {})
                .Case("value2", {})
            .should.deep.equal(
                new $.Match(to, [
                    new $.Case(new $.PatternPrimitive("value"), [{}]),
                    new $.Case(new $.PatternPrimitive("value2"), [{}])]))
            Match(to)
                .Case("value", {})
                .Otherwise({})
            .should.deep.equal(
                new $.Match(to, [new $.Case(new $.PatternPrimitive("value"), [{}])], new $.Otherwise([{}])))
        })
        it("create instances of Cond", () => {
            to.Contains("x").should.deep.equal(new $.CondKey($.Predicate.Contains, "x", to))
            Mail.Contains(0).should.deep.equal(new $.CondMail($.Predicate.Contains, 0))
            Mail.Larger(0).should.deep.equal(new $.CondMail($.Predicate.Larger, 0))
            Mail.Smaller(0).should.deep.equal(new $.CondMail($.Predicate.Smaller, 0))
            Mail.After(0).should.deep.equal(new $.CondMail($.Predicate.After, 0))
            Mail.Before(0).should.deep.equal(new $.CondMail($.Predicate.Before, 0))
            Mail.Older(0).should.deep.equal(new $.CondMail($.Predicate.Older, 0))
            Mail.Newer(0).should.deep.equal(new $.CondMail($.Predicate.Newer, 0))
            Mail.OlderThan(0).should.deep.equal(new $.CondMail($.Predicate.OlderThan, 0))
            Mail.NewerThan(0).should.deep.equal(new $.CondMail($.Predicate.NewerThan, 0))
            Mail.Is(0).should.deep.equal(new $.CondMail($.Predicate.Is, 0))
            Mail.In(0).should.deep.equal(new $.CondMail($.Predicate.In, 0))
            Mail.Has(0).should.deep.equal(new $.CondMail($.Predicate.Has, 0))
            Not(to.Contains("x")).should.deep.equal(
                new $.CondUniaryOperator(
                    new $.CondKey($.Predicate.Contains, "x", to),
                    $.UniaryOperator.Not))
            And(to.Contains("x")).should.deep.equal(
                new $.CondMultiaryOperator(
                    [new $.CondKey($.Predicate.Contains, "x", to)], $.MultiaryOperator.And))
            Or(to.Contains("x")).should.deep.equal(
                new $.CondMultiaryOperator(
                    [new $.CondKey($.Predicate.Contains, "x", to)], $.MultiaryOperator.Or))
        })
        it("create instances of If", () => {
            If(to.Contains("value"), {}).should.deep.equal(
                new $.If(new $.CondKey($.Predicate.Contains, "value", to),
                    [{}], [], undefined))
            If(to.Contains("value"), {}).Else({}).should.deep.equal(
                new $.If(new $.CondKey($.Predicate.Contains, "value", to),
                [{}], [], new $.Else([{}])))
            If(to.Contains("value1"), {}, {})
             .Elif(to.Contains("value2"), {})
             .Elif(to.Contains("value3"), {})
             .Else({})
            .should.deep.equal(
                 new $.If(new $.CondKey($.Predicate.Contains, "value1", to),
                 [{}, {}],
                 [
                     new $.Elif(new $.CondKey($.Predicate.Contains, "value2", to), [{}]),
                     new $.Elif(new $.CondKey($.Predicate.Contains, "value3", to), [{}]),
                 ],
                 new $.Else([{}]),
            ))
        })
        it("complex case", () => {
            Match(to)
                .Case(Not("value"),
                    If(K("key2").Contains("foo"), {})
                      .Else({}))
                .Otherwise({})
            .should.deep.equal(
                new $.Match(to,
                [
                    new $.Case(
                        new $.PatternUniaryOperator(new $.PatternPrimitive("value"), $.UniaryOperator.Not),
                        [
                            new $.If(new $.CondKey($.Predicate.Contains, "foo", new $.Key("key2")),
                                [{}],
                                [],
                                new $.Else([{}])),
                        ]),
                ],
                new $.Otherwise([{}])),
            )
        })
    })
})
