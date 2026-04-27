export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["./src/__test__"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};