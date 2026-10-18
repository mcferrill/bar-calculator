import assert from "node:assert/strict";
import { formatSessionDate } from "../src/lib/format.ts";
import {
	deleteSession,
	formValuesFromFormData,
	sessionFromFormValues,
	sessionToFormValues,
	updateSession,
} from "../src/lib/session.ts";

function form(entries) {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.set(key, value);
	return data;
}

const values = formValuesFromFormData(
	form({
		intent: "update",
		id: "abc",
		date: "2024-01-02",
		unit: "kg",
		bodyweight: "80",
		notes: "easy",
		liftCount: "1",
		lift_0_name: "Run",
		lift_0_notes: "trail",
		lift_0_blockCount: "1",
		lift_0_block_0_sets: "1",
		lift_0_block_0_reps: "1",
		lift_0_block_0_repsTo: "3",
		lift_0_block_0_weight: "",
		lift_0_block_0_durationSec: "90",
		lift_0_block_0_distanceM: "400",
	}),
);
const session = sessionFromFormValues(values);
assert.equal(session.unit, "kg");
assert.equal(session.lifts[0].blocks[0].repsTo, 3);
assert.equal(session.lifts[0].blocks[0].durationSec, 90);
assert.equal(session.lifts[0].blocks[0].distanceM, 400);
assert.equal(session.lifts[0].blocks[0].weight, undefined);

const round = sessionToFormValues({ ...session, id: "abc" });
assert.deepEqual(sessionFromFormValues(round).lifts, session.lifts);
assert.throws(() => sessionFromFormValues({ ...values, date: "nope" }));

function fake(changes, sink) {
	return {
		prepare(sql) {
			return {
				bind(...args) {
					return {
						async run() {
							sink.sql = sql;
							sink.args = args;
							return { success: true, meta: { changes } };
						},
					};
				},
			};
		},
	};
}

const sink = {};
assert.equal(await updateSession(fake(1, sink), "abc", session), true);
assert.match(sink.sql, /WHERE id = \?/);
assert.equal(sink.args.at(-1), "abc");
assert.equal(await updateSession(fake(0, sink), "missing", session), false);
assert.equal(await deleteSession(fake(1, sink), "abc"), true);
assert.match(sink.sql, /DELETE FROM sessions WHERE id = \?/);
assert.deepEqual(sink.args, ["abc"]);
assert.equal(await deleteSession(fake(0, sink), "nope"), false);

assert.equal(formatSessionDate("2024-01-02").day, "Tue, Jan 2");
assert.equal(formatSessionDate("2024-01-02").month, "January 2024");
assert.equal(formatSessionDate("nope").day, "nope");

console.log("session check ok");
