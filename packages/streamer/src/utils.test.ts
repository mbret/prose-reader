import { sortByTitleComparator } from "./utils"

test(``, () => {
  expect([`a`, `b`].sort(sortByTitleComparator)).toEqual([`a`, `b`])
})

test(``, () => {
  expect([`b`, `a`].sort(sortByTitleComparator)).toEqual([`a`, `b`])
})

test(``, () => {
  expect([`1`, `2`].sort(sortByTitleComparator)).toEqual([`1`, `2`])
})

test(``, () => {
  expect([`2`, `1`].sort(sortByTitleComparator)).toEqual([`1`, `2`])
})

test(``, () => {
  expect([`10`, `2`].sort(sortByTitleComparator)).toEqual([`2`, `10`])
})

test(``, () => {
  expect([`foo 10`, `foo 11`].sort(sortByTitleComparator)).toEqual([`foo 10`, `foo 11`])
})

test(``, () => {
  expect([`foo 10`, `foo 2`].sort(sortByTitleComparator)).toEqual([`foo 2`, `foo 10`])
})

test(``, () => {
  expect([`a 10`, `b 2`].sort(sortByTitleComparator)).toEqual([`a 10`, `b 2`])
})
