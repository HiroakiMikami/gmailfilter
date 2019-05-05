import * as chai from "chai"
chai.should()

import { ArrayUtils, FilterActionUtils, FilterCriteriaUtils, FilterUtils, SetUtils } from "../src/utils"

describe("Utils", () => {
    describe("ArrayUtils#equals", () => {
        it("check equality of two arrays", () => {
            ArrayUtils.equals([0, 1], [0, 1]).should.equal(true)
            ArrayUtils.equals([0, 1], [1, 0]).should.equal(false)
            ArrayUtils.equals([0, 1], [0]).should.equal(false)
        })
    })
    describe("SetUtils#equals", () => {
        it("check equality of two sets", () => {
            SetUtils.equals(new Set([0, 1]), new Set([0, 1])).should.equal(true)
            SetUtils.equals(new Set([0, 1]), new Set([1, 0])).should.equal(true)
            SetUtils.equals(new Set([0, 1]), new Set([0])).should.equal(false)
        })
    })
    describe("FilterActionUtils#equals", () => {
        it("check equality of two actions", () => {
            FilterActionUtils.equals(
                { addLabelIds: ["foo"] }, { addLabelIds: ["foo"] },
            ).should.equal(true)
            FilterActionUtils.equals(
                { removeLabelIds: ["foo"] }, { removeLabelIds: ["foo"] },
            ).should.equal(true)
            FilterActionUtils.equals(
                { addLabelIds: ["foo"] }, { removeLabelIds: ["foo"] },
            ).should.equal(false)
        })
    })
    describe("FilterCriteriaUtils#equals", () => {
        it("check equality of two criterias", () => {
            FilterCriteriaUtils.equals(
                { query: "to:foo@bar" }, { query: "to:foo@bar" },
            ).should.equal(true)
            FilterCriteriaUtils.equals(
                { query: "to:foo@bar" }, { negatedQuery: "to:foo@bar" },
            ).should.equal(false)
        })
    })
    describe("FilterUtils#equals", () => {
        it("check equality of two filters", () => {
            FilterUtils.equals(
                {}, {},
            ).should.equal(true)
            FilterUtils.equals(
                {}, { action: { addLabelIds: ["foo"] }},
            ).should.equal(false)
        })
    })
})
