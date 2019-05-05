import * as chai from "chai"
const should = chai.should()

import * as $ from "../src/dsl"
import { Has, If, In, Is, K, Larger, Match, Not, Smaller } from "../src/dsl_syntax"

describe("DSL", () => {
    describe("syntax", () => {
        it("create an instance of Key", () => {
            K("key").should.deep.equal(new $.Key("key"))
        })
        it("create instances of CondIf", () => {
            K("key").Larger(0).should.deep.equal(new $.CondIfWithKey(new $.Key("key"), $.PredicateWithKey.Larger, 0))
            K("key").Smaller(0).should.deep.equal(new $.CondIfWithKey(new $.Key("key"), $.PredicateWithKey.Smaller, 0))
            K("key").Is("value").should.deep.equal(
                new $.CondIfWithKey(new $.Key("key"), $.PredicateWithKey.Is, "value"))
            Is("starred").should.deep.equal(new $.CondIfWithoutKey($.PredicateWithoutKey.Is, "starred"))
            Has("attachment").should.deep.equal(new $.CondIfWithoutKey($.PredicateWithoutKey.Has, "attachment"))
            In("chats").should.deep.equal(new $.CondIfWithoutKey($.PredicateWithoutKey.In, "chats"))
            Not(In("chats")).should.deep.equal(new $.CondIfWithoutKey($.PredicateWithoutKey.In, "chats", true))
        })
        it("create instances of CondCase", () => {
            Larger(0).should.deep.equal(new $.CondCase($.PredicateWithKey.Larger, 0))
            Smaller(0).should.deep.equal(new $.CondCase($.PredicateWithKey.Smaller, 0))
            Not(0).should.deep.equal(new $.CondCase($.PredicateWithKey.Is, 0, true))
            Not(Smaller(0)).should.deep.equal(new $.CondCase($.PredicateWithKey.Smaller, 0, true))
        })
        it("create instances of If", () => {
            If(K("key").Is("value"), {}).should.deep.equal(
                new $.If(new $.CondIfWithKey(new $.Key("key"), $.PredicateWithKey.Is, "value"), {}, [], null))
            If(K("key").Is("value"), {}).Else({}).should.deep.equal(
                new $.If(new $.CondIfWithKey(new $.Key("key"), $.PredicateWithKey.Is, "value"), {}, [], new $.Else({})))
            If(K("key").Is("value1"), {})
             .Elif(K("key").Is("value2"), {})
             .Elif(K("key").Is("value3"), {})
             .Else({})
            .should.deep.equal(
                 new $.If(new $.CondIfWithKey(new $.Key("key"), $.PredicateWithKey.Is, "value1"), {},
                 [
                     new $.Elif(new $.CondIfWithKey(new $.Key("key"), $.PredicateWithKey.Is, "value2"), {}),
                     new $.Elif(new $.CondIfWithKey(new $.Key("key"), $.PredicateWithKey.Is, "value3"), {}),
                 ],
                 new $.Else({}),
            ))
        })
        it("create instances of Match", () => {
            Match(K("key"))
                .Case("value", {})
            .should.deep.equal(
                new $.Match(new $.Key("key"), [new $.Case(new $.CondCase($.PredicateWithKey.Is, "value"), {})], null))
            Match(K("key"))
                .Case("value", {})
                .Otherwise({})
            .should.deep.equal(
                new $.Match(new $.Key("key"),
                    [new $.Case(new $.CondCase($.PredicateWithKey.Is, "value"), {})], new $.Otherwise({})))
        })
        it("complex case", () => {
            Match(K("key"))
                .Case(Not("value"),
                    If(K("key2").Is("foo"), {})
                      .Else({}))
                .Otherwise({})
            .should.deep.equal(
                new $.Match(new $.Key("key"),
                [
                    new $.Case(new $.CondCase($.PredicateWithKey.Is, "value", true),
                        new $.If(new $.CondIfWithKey(new $.Key("key2"), $.PredicateWithKey.Is, "foo"), {}, [],
                        new $.Else({}))),
                ],
                new $.Otherwise({})),
            )
        })
    })
    describe("#stringify", () => {
        it("stringify Predicate", () => {
            $.PredicateWithKey.stringify($.PredicateWithKey.Is).should.equal("")
            $.PredicateWithKey.stringify($.PredicateWithKey.Larger).should.equal("larger")
            $.PredicateWithKey.stringify($.PredicateWithKey.Smaller).should.equal("smaller")
            $.PredicateWithoutKey.stringify($.PredicateWithoutKey.Is).should.equal("is")
            $.PredicateWithoutKey.stringify($.PredicateWithoutKey.In).should.equal("in")
            $.PredicateWithoutKey.stringify($.PredicateWithoutKey.Has).should.equal("has")
        })
    })
    describe("#toQuery", () => {
        it("create a query string from CondIf", () => {
            $.toQuery(new $.CondIfWithKey(K("key"), $.PredicateWithKey.Is, "value")).should.equal("key:value")
            $.toQuery(new $.CondIfWithKey(K("size"), $.PredicateWithKey.Larger, 0)).should.equal("larger:0")
            $.toQuery(new $.CondIfWithKey(K("size"), $.PredicateWithKey.Smaller, 0)).should.equal("smaller:0")
            $.toQuery(new $.CondIfWithoutKey($ .PredicateWithoutKey.Has, "attachment")).should.equal("has:attachment")
        })
        it("create a query string from CondCase and Key", () => {
            $.toQuery(new $.CondCase($.PredicateWithKey.Is, 0), K("key")).should.equal("key:0")
            $.toQuery(new $.CondCase($.PredicateWithKey.Larger, 0), K("size")).should.equal("larger:0")
            $.toQuery(new $.CondCase($.PredicateWithKey.Smaller, 0), K("size")).should.equal("smaller:0")
        })
        it("throw an expcetion when the key name is not size and predicate is larger or smaller", () => {
            should.Throw(() => $.toQuery(new $.CondIfWithKey(K("subject"), $.PredicateWithKey.Smaller, 0)), /.*/)
            should.Throw(() => $.toQuery(new $.CondCase($.PredicateWithKey.Smaller, 0), K("subject")), /.*/)
        })
    })
    describe("#toCriteria", () => {
        it("create a criteria instance", () => {
            $.toCriteria(new $.CondCase($.PredicateWithKey.Is, 0), K("key")).should.deep.equal({ query: "key:0" })
            $.toCriteria(new $.CondCase($.PredicateWithKey.Is, 0, true), K("key"))
                .should.deep.equal({ negatedQuery: "key:0" })
        })
    })
    describe("Criteria", () => {
        describe("#not", () => {
            it("negate a criteria", () => {
                $.Criteria.not({ query: "q" }).should.deep.equal({ negatedQuery: "q" })
                $.Criteria.not({ negatedQuery: "q" }).should.deep.equal({ query: "q" })
                $.Criteria.not({ query: "q1", negatedQuery: "q2" })
                    .should.deep.equal({ query: "q2", negatedQuery: "q1" })
            })
        })
        describe("#merge", () => {
            it("merge an array of criterias", () => {
                $.Criteria.merge([
                    { query: "q" },
                ]).should.deep.equal({ query: "q" })
                $.Criteria.merge([
                    { query: "q" }, { query: "q2"},
                ]).should.deep.equal({ query: "q q2" })
                $.Criteria.merge([
                    { negatedQuery: "q" }, { negatedQuery: "q2"},
                ]).should.deep.equal({ negatedQuery: "q q2" })
                $.Criteria.merge([
                    { query: "q" }, { negatedQuery: "q2"},
                ]).should.deep.equal({ query: "q", negatedQuery: "q2" })
            })
        })
    })
    describe("#evaluate", () => {
        it("create filters from If", () => {
            $.evaluate(If(K("subject").Is("foo"), {})).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "subject:foo" },
                },
            ])
        })
        it("create filters from If-Elif", () => {
            $.evaluate(
                If(K("subject").Is("foo"), {})
                .Elif(Not(K("to").Is("bar")), {}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "subject:foo" },
                },
                {
                    action: {},
                    criteria: { negatedQuery: "subject:foo to:bar" },
                },
            ])
        })
        it("create filters from If-Else", () => {
            $.evaluate(
                If(K("subject").Is("foo"), {})
                .Else({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "subject:foo" },
                },
                {
                    action: {},
                    criteria: { negatedQuery: "subject:foo" },
                },
            ])
        })
        it("create filters from If-Elif-Else", () => {
            $.evaluate(
                If(K("subject").Is("foo"), {})
                .Elif(Not(K("to").Is("bar")), {})
                .Else({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "subject:foo" },
                },
                {
                    action: {},
                    criteria: { negatedQuery: "subject:foo to:bar" },
                },
                {
                    action: {},
                    criteria: { query: "to:bar", negatedQuery: "subject:foo" },
                },
            ])
        })
        it("throw an error if there is no Case instances in the Match instance", () => {
            should.Throw(() => $.evaluate(Match(K("key"))), /.*/)
            should.Throw(() => $.evaluate(Match(K("key")).Otherwise({})), /.*/)
        })
        it("create filters from Match-Case", () => {
            $.evaluate(
                Match(K("to"))
                    .Case("value", {})
                    .Case("value2", {}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "to:value" },
                },
                {
                    action: {},
                    criteria: { query: "to:value2" },
                },
            ])
        })
        it("create filters from Match-Case-Otherwise", () => {
            $.evaluate(
                Match(K("to"))
                    .Case("value", {})
                    .Case("value2", {})
                    .Otherwise({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "to:value" },
                },
                {
                    action: {},
                    criteria: { query: "to:value2" },
                },
                {
                    action: {},
                    criteria: { negatedQuery: "to:value to:value2" },
                },
            ])
        })
        it("complex case 1", () => {
            $.evaluate(
                If(Is("starred"),
                    Match(K("to"))
                        .Case("foo@bar", {}))
                .Else({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "is:starred to:foo@bar" },
                },
                {
                    action: {},
                    criteria: { negatedQuery: "is:starred" },
                },
            ])
        })
        it("complex case 2", () => {
            $.evaluate(
                If(Is("starred"), {})
                .Else(
                    Match(K("to"))
                        .Case("foo@bar", {})),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "is:starred" },
                },
                {
                    action: {},
                    criteria: { negatedQuery: "is:starred", query: "to:foo@bar" },
                },
            ])
        })
        it("complex case 3", () => {
            $.evaluate(
                Match(K("to"))
                    .Case("foo@bar",
                        If(Is("starred"), {}))
                    .Otherwise({}),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "to:foo@bar is:starred" },
                },
                {
                    action: {},
                    criteria: { negatedQuery: "to:foo@bar" },
                },
            ])
        })
        it("complex case 4", () => {
            $.evaluate(
                Match(K("to"))
                    .Case("foo@bar", {})
                    .Otherwise(
                        If(Is("starred"), {})),
            ).should.deep.equal([
                {
                    action: {},
                    criteria: { query: "to:foo@bar" },
                },
                {
                    action: {},
                    criteria: { query: "is:starred", negatedQuery: "to:foo@bar" },
                },
            ])
        })
    })
})
