import * as google from "googleapis"

export namespace ArrayUtils {
    export function equals<V>(lhs: ReadonlyArray<V>, rhs: ReadonlyArray<V>) {
        if ((lhs || []).length !== (rhs || []).length) {
            return false
        }
        return (lhs || []).every((value, index) => value === (rhs || [])[index])
    }
}
export namespace SetUtils {
    export function equals<V>(lhs: ReadonlySet<V>, rhs: ReadonlySet<V>) {
        if ((lhs || new Set([])).size !== (rhs || new Set([])).size) {
            return false
        }
        return Array.from(lhs || []).every((value) => (rhs || new Set([])).has(value))
    }

}

export namespace FilterActionUtils {
    export function equals(
        lhs: google.gmail_v1.Schema$FilterAction,
        rhs: google.gmail_v1.Schema$FilterAction) {
        return lhs.forward === rhs.forward &&
            SetUtils.equals(new Set(lhs.addLabelIds), new Set(rhs.addLabelIds)) &&
            SetUtils.equals(new Set(lhs.removeLabelIds), new Set(rhs.removeLabelIds))
    }
}
export namespace FilterCriteriaUtils {
    export function equals(
        lhs: google.gmail_v1.Schema$FilterCriteria,
        rhs: google.gmail_v1.Schema$FilterCriteria) {
        return lhs.excludeChats === rhs.excludeChats &&
            lhs.from === rhs.from &&
            lhs.hasAttachment === rhs.hasAttachment &&
            lhs.negatedQuery === rhs.negatedQuery &&
            lhs.query === rhs.query &&
            lhs.size === rhs.size &&
            lhs.sizeComparison === rhs.sizeComparison &&
            lhs.subject === rhs.subject &&
            lhs.to === rhs.to
    }
}
export namespace FilterUtils {
    export function equals(lhs: google.gmail_v1.Schema$Filter, rhs: google.gmail_v1.Schema$Filter) {
        return FilterCriteriaUtils.equals(lhs.criteria || {}, rhs.criteria || {}) &&
            FilterActionUtils.equals(lhs.action || {}, rhs.action || {})
    }
}
