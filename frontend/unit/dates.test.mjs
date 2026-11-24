import assert from "node:assert/strict";
import test from "node:test";
import {dateKey, dateTimeISO, localInput, monthStart, onDay, shiftDate} from "../src/dates.ts";

test("usa o dia civil de São Paulo ao atravessar a meia-noite UTC", () => {
  assert.equal(dateKey("2026-11-25T02:59:59Z"), "2026-11-24");
  assert.equal(localInput("2026-11-25T03:00:00Z"), "2026-11-25T00:00");
});

test("converte horários do formulário com as regras do fuso para a data", () => {
  assert.equal(dateTimeISO("2026-11-24T15:15"), "2026-11-24T18:15:00.000Z");
  assert.equal(dateTimeISO("2018-12-10T15:15"), "2018-12-10T17:15:00.000Z");
  assert.throws(() => dateTimeISO("2018-11-04T00:30"), /horário não existe/);
});

test("mantém o término exclusivo de um evento de vários dias", () => {
  const event = {starts_at: "2026-11-01T03:00:00Z", ends_at: "2026-11-03T03:00:00Z"};
  assert.equal(onDay(event, "2026-10-31"), false);
  assert.equal(onDay(event, "2026-11-01"), true);
  assert.equal(onDay(event, "2026-11-02"), true);
  assert.equal(onDay(event, "2026-11-03"), false);
});

test("navega por fevereiro bissexto e pelas viradas de ano", () => {
  assert.equal(shiftDate("2028-03-01", -1), "2028-02-29");
  assert.equal(monthStart("2026-12-31", 1), "2027-01-01");
  assert.equal(monthStart("2026-01-31", -1), "2025-12-01");
});
