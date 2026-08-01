import { describe, expect, it } from "vitest"
import {
  normalizeForComparison,
  personNameSimilarity,
  textSimilarity,
  titleSimilarity,
} from "./similarity.ts"

describe("normalizeForComparison", () => {
  it("folds case, diacritics and punctuation", () => {
    expect(normalizeForComparison("Les Misérables")).toBe("les miserables")
    expect(normalizeForComparison("Dune: Messiah")).toBe("dune messiah")
    expect(normalizeForComparison("  Spider-Man!  ")).toBe("spider man")
  })
})

describe("textSimilarity", () => {
  it("scores equal strings 1, whatever the punctuation and case", () => {
    expect(textSimilarity("Dune", "dune")).toBe(1)
    expect(textSimilarity("Spider-Man", "Spider Man")).toBe(1)
    expect(textSimilarity("Les Misérables", "Les Miserables")).toBe(1)
  })

  it("scores an empty side 0", () => {
    expect(textSimilarity("", "Dune")).toBe(0)
    expect(textSimilarity("Dune", "   ")).toBe(0)
  })

  it("ranks a longer variant of a title above an unrelated one", () => {
    expect(textSimilarity("Dune", "Neuromancer")).toBeLessThan(0.3)
    expect(
      textSimilarity("The Hobbit", "The Hobbit, or There and Back Again"),
    ).toBeGreaterThan(textSimilarity("The Hobbit", "Neuromancer"))
  })

  it("does not overrate a single shared character", () => {
    expect(textSimilarity("A", "B")).toBe(0)
    expect(textSimilarity("A", "A")).toBe(1)
  })
})

describe("titleSimilarity", () => {
  it("repairs a subtitle only one side states", () => {
    expect(titleSimilarity("Dune", "Dune: a novel")).toBe(0.9)
    expect(titleSimilarity("Dune - a novel", "Dune")).toBe(0.9)
  })

  it("does not read a longer title as a subtitled one", () => {
    expect(titleSimilarity("Dune", "Dune Messiah")).toBeLessThan(0.7)
  })

  it("compares stated subtitles for real", () => {
    expect(titleSimilarity("Dune: Book One", "Dune: Messiah")).toBeLessThan(0.8)
  })

  it("rejects contradictory volume, part, and book numbers", () => {
    expect(
      titleSimilarity(
        "Wilhelm Meister's apprenticeship and travels, vol. 2 of 2",
        "Wilhelm Meister's Apprenticeship and Travels, Vol. I (of 2)",
      ),
    ).toBe(0)
    expect(titleSimilarity("The Story, Part Two", "The Story, Part III")).toBe(
      0,
    )
    expect(
      titleSimilarity("Chronicles: Book 4", "Chronicles: Book Fourth"),
    ).toBeGreaterThan(0)
  })

  it("does not invent a contradiction when only one title states a division", () => {
    expect(titleSimilarity("Dune", "Dune: Book One")).toBeGreaterThan(0)
    expect(
      titleSimilarity("Collected Works, Volume II", "Collected Works, vol. 2"),
    ).toBeGreaterThan(0.8)
  })

  it("keeps exact full titles exact", () => {
    expect(titleSimilarity("Dune", "Dune")).toBe(1)
    expect(titleSimilarity("Dune: Messiah", "Dune: Messiah")).toBe(1)
  })
})

describe("personNameSimilarity", () => {
  it("treats an inverted name as the same person", () => {
    expect(personNameSimilarity("Herbert, Frank", "Frank Herbert")).toBe(1)
  })

  it("still separates different people", () => {
    expect(
      personNameSimilarity("Frank Herbert", "William Gibson"),
    ).toBeLessThan(0.3)
  })
})
