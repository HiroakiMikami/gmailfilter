import * as chai from "chai"
const should = chai.should()

import * as $ from "../src/dsl"
import { And, Around, If, K, Mail, Match, Not, Or, subject, to } from "../src/dsl_syntax"

describe("DSL", () => {
    describe("#stringify", () => {
        it("stringify Primitive", () => {
            $.stringify("foo").should.equal("foo")
            $.stringify(0).should.equal("0")
            $.stringify(Around("w1", "w2")).should.equal("w1 AROUND w2")
            $.stringify(Around("w1", "w2").Within(1)).should.equal("w1 AROUND 1 w2")
        })
        it("stringify Predicate", () => {
            $.stringify($.Predicate.Contains).should.equal("contains")
            $.stringify($.Predicate.Has).should.equal("has")
            $.stringify($.Predicate.Larger).should.equal("larger")
            $.stringify($.Predicate.Smaller).should.equal("smaller")
            $.stringify($.Predicate.After).should.equal("after")
            $.stringify($.Predicate.Before).should.equal("before")
            $.stringify($.Predicate.Older).should.equal("older")
            $.stringify($.Predicate.Newer).should.equal("newer")
            $.stringify($.Predicate.OlderThan).should.equal("older_than")
            $.stringify($.Predicate.NewerThan).should.equal("newer_than")
            $.stringify($.Predicate.Is).should.equal("is")
            $.stringify($.Predicate.In).should.equal("in")
        })
    })
    describe("#toQuery", () => {
        it("create a query string from Cond", () => {
            $.toQuery(to.Contains("value")).should.equal('to:"value"')
            $.toQuery(Mail.Contains("value")).should.equal('"value"')
            $.toQuery(Mail.Larger("1")).should.equal('larger:"1"')
            $.toQuery(Not(to.Contains("value"))).should.deep.equal(
                new $.QueryUniaryOperator('to:"value"', $.UniaryOperator.Not))
            $.toQuery(And(to.Contains("value"))).should.deep.equal(
                new $.QueryMultiaryOperator(['to:"value"'], $.MultiaryOperator.And))
            $.toQuery(Or(to.Contains("value"))).should.deep.equal(
                new $.QueryMultiaryOperator(['to:"value"'], $.MultiaryOperator.Or))
        })
        it("create a query string from Pattern and Key", () => {
            $.toQuery(new $.PatternPrimitive("value"), to).should.equal('to:"value"')
            $.toQuery(Not("value"), to).should.deep.equal(
                new $.QueryUniaryOperator('to:"value"', $.UniaryOperator.Not))
            $.toQuery(And(Not("value")), to).should.deep.equal(
                new $.QueryMultiaryOperator(
                    [new $.QueryUniaryOperator('to:"value"', $.UniaryOperator.Not)],
                    $.MultiaryOperator.And))
            $.toQuery(Or(Not("value")), to).should.deep.equal(
                new $.QueryMultiaryOperator(
                    [new $.QueryUniaryOperator('to:"value"', $.UniaryOperator.Not)],
                    $.MultiaryOperator.Or))
        })
    })
    describe("#toCriteria", () => {
        it("create a Criteria instance from Query", () => {
            $.toCriteria($.toQuery(to.Contains("value"))).should.deep.equal({ query: 'to:"value"' })
            $.toCriteria($.toQuery(Not(to.Contains("value")))).should.deep.equal(
                { query: '(NOT to:"value")' })
            $.toCriteria($.toQuery(And(to.Contains("value"), to.Contains("value2")))).should.deep.equal(
                { query: '(to:"value" to:"value2")' })
            $.toCriteria($.toQuery(Or(to.Contains("value"), to.Contains("value2")))).should.deep.equal(
                { query: '(to:"value" OR to:"value2")' })
        })
    })
    describe("#evaluate", () => {
        it("create filters from If", () => {
            $.evaluate(If(subject.Contains("foo"), {})).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(subject:\"foo\")" },
                },
            ])
        })
        it("create filters from If-Elif", () => {
            $.evaluate(
                If(subject.Contains("foo"), {})
                .Elif(Not(to.Contains("bar")), {}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(subject:\"foo\")" },
                },
                {
                    action: {},
                    criteria: { query: "((NOT subject:\"foo\") (NOT to:\"bar\"))" },
                },
            ])
        })
        it("create filters from If-Else", () => {
            $.evaluate(
                If(subject.Contains("foo"), {})
                .Else({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(subject:\"foo\")" },
                },
                {
                    action: {},
                    criteria: { query: "((NOT subject:\"foo\"))" },
                },
            ])
        })
        it("create filters from If-Elif-Else", () => {
            $.evaluate(
                If(subject.Contains("foo"), {})
                .Elif(Not(to.Contains("bar")), {})
                .Else({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(subject:\"foo\")" },
                },
                {
                    action: {},
                    criteria: { query: "((NOT subject:\"foo\") (NOT to:\"bar\"))" },
                },
                {
                    action: {},
                    criteria: { query: "((NOT subject:\"foo\") (NOT (NOT to:\"bar\")))" },
                },
            ])
        })
        it("throw an error if there is no Case instances in the Match instance", () => {
            should.Throw(() => $.evaluate(Match(K("key"))), /.*/)
            should.Throw(() => $.evaluate(Match(K("key")).Otherwise({})), /.*/)
        })
        it("create filters from Match-Case", () => {
            $.evaluate(
                Match(to)
                    .Case("value", {})
                    .Case("value2", {}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(to:\"value\")" },
                },
                {
                    action: {},
                    criteria: { query: "(to:\"value2\")" },
                },
            ])
        })
        it("create filters from Match-Case-Otherwise", () => {
            $.evaluate(
                Match(to)
                    .Case("value", {})
                    .Case("value2", {})
                    .Otherwise({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(to:\"value\")" },
                },
                {
                    action: {},
                    criteria: { query: "(to:\"value2\")" },
                },
                {
                    action: {},
                    criteria: { query: "((NOT to:\"value\") (NOT to:\"value2\"))" },
                },
            ])
        })
        it("complex case 1", () => {
            $.evaluate(
                If(Mail.Is("starred"),
                    Match(to)
                        .Case("foo@bar", {}))
                .Else({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(is:\"starred\" (to:\"foo@bar\"))" },
                },
                {
                    action: {},
                    criteria: { query: "((NOT is:\"starred\"))" },
                },
            ])
        })
        it("complex case 2", () => {
            $.evaluate(
                If(Mail.Is("starred"), {})
                .Else(
                    Match(to)
                        .Case("foo@bar", {})),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(is:\"starred\")" },
                },
                {
                    action: {},
                    criteria: { query: "((NOT is:\"starred\") (to:\"foo@bar\"))" },
                },
            ])
        })
        it("complex case 3", () => {
            $.evaluate(
                Match(K("to"))
                    .Case("foo@bar",
                        If(Mail.Is("starred"), {}))
                    .Otherwise({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(to:\"foo@bar\" (is:\"starred\"))" },
                },
                {
                    action: {},
                    criteria: { query: "((NOT to:\"foo@bar\"))" },
                },
            ])
        })
        it("complex case 4", () => {
            $.evaluate(
                Match(to)
                    .Case("foo@bar", {})
                    .Otherwise(
                        If(Mail.Is("starred"), {})),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "(to:\"foo@bar\")" },
                },
                {
                    action: {},
                    criteria: { query: "((NOT to:\"foo@bar\") (is:\"starred\"))" },
                },
            ])
        })
        it("split addLabelIds", () => {
            $.evaluate(
                Match(to).Case("foo@bar", {addLabelIds: ["foo", "bar"], removeLabelIds: ["test"] }),
            ).should.deep.equal([
                {
                    action: {addLabelIds: ["foo"], removeLabelIds: ["test"] },
                    criteria: { query: "(to:\"foo@bar\")" },
                },
                {
                    action: { addLabelIds: ["bar"] },
                    criteria: { query: "(to:\"foo@bar\")" },
                },
            ])
        })
    })
})
