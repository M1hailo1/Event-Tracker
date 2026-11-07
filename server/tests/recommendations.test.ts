import { buildPreferences, rankRecommendations } from "../src/utils/recommendations";

const music = { id: "music", name: "Music" };
const film = { id: "film", name: "Film" };
const categorized = (category = music) => ({ category, categories: [category] });

test("explicit interests outweigh a save, and a save outweighs a past registration", () => {
  const preferences = buildPreferences([film], [categorized()], [categorized()]);
  const results = rankRecommendations([
    { ...categorized(), id: "a", date: new Date("2099-01-01") },
    { ...categorized(film), id: "b", date: new Date("2099-02-01") },
  ], preferences);
  expect(results.map(event => event.id)).toEqual(["b", "a"]);
  expect(results[0].recommendationReason).toBe("Matches your interest in Film");
  expect(results[1].recommendationScore).toBe(4);
});

test("empty history and equal scores produce stable date and ID ordering", () => {
  const results = rankRecommendations(["b", "a"].map(id => ({ ...categorized(), id, date: new Date("2099-01-01") })), buildPreferences([], [], []));
  expect(results.map(event => event.id)).toEqual(["a", "b"]);
  expect(results[0].recommendationReason).toBeUndefined();
});
