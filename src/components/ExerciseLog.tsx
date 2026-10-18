import { useEffect, useRef, useState } from "react";
import { formatBlock, formatSessionDate } from "../lib/format";
import type { SessionFormValues } from "../lib/session";
import SessionForm from "./SessionForm";

export type SessionView = {
	id: string;
	date: string;
	unit: "lb" | "kg";
	bodyweight?: number;
	notes?: string;
	lifts: {
		name: string;
		notes?: string;
		blocks: {
			sets: number;
			reps?: number;
			repsTo?: number;
			weight?: number;
			durationSec?: number;
			distanceM?: number;
		}[];
	}[];
};

type Props = {
	sessions: SessionView[];
	active?: SessionView[];
	error?: string;
	formError?: string;
	formInitial?: SessionFormValues;
	savedId?: string;
};

const btnPrimary =
	"min-h-11 px-4 py-2 rounded-sm bg-blue-700 hover:opacity-90 text-gray-100 text-sm font-medium";

function draftFromSession(session: SessionView): SessionFormValues {
	const num = (value?: number) => (value == null ? "" : String(value));
	return {
		id: session.id,
		intent: "update",
		date: session.date,
		unit: session.unit,
		bodyweight: num(session.bodyweight),
		notes: session.notes ?? "",
		lifts: session.lifts.map((lift) => ({
			name: lift.name,
			notes: lift.notes ?? "",
			blocks: lift.blocks.map((block) => ({
				sets: String(block.sets),
				reps: num(block.reps),
				repsTo: num(block.repsTo),
				weight: num(block.weight),
				durationSec: num(block.durationSec),
				distanceM: num(block.distanceM),
			})),
		})),
	};
}

function groupSessions(sessions: SessionView[]) {
	const groups: { month: string; sessions: SessionView[] }[] = [];
	for (const session of sessions) {
		const month = formatSessionDate(session.date).month;
		const last = groups.at(-1);
		if (last?.month === month) last.sessions.push(session);
		else groups.push({ month, sessions: [session] });
	}
	return groups;
}

export default function ExerciseLog({
	sessions,
	active = [],
	error,
	formError,
	formInitial,
	savedId,
}: Props) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const openAfterPaint = useRef(false);
	const [draft, setDraft] = useState(formInitial);
	const [formKey, setFormKey] = useState(0);
	const [modalError, setModalError] = useState(formInitial ? formError : undefined);
	const groups = groupSessions(sessions);

	useEffect(() => {
		if (!savedId) return;
		document.getElementById(`session-${savedId}`)?.scrollIntoView({ block: "center" });
		history.replaceState(null, "", "/");
	}, [savedId]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		const shouldOpen = openAfterPaint.current || (!dialog.open && formInitial);
		openAfterPaint.current = false;
		if (!shouldOpen) return;
		if (!dialog.open) dialog.showModal();
		dialog.querySelector<HTMLInputElement>("input[name='lift_0_name']")?.focus();
	}, [formKey, formInitial]);

	function isDirty() {
		return (
			dialogRef.current
				?.querySelector("form[data-session-form]")
				?.getAttribute("data-dirty") === "true"
		);
	}

	function close() {
		dialogRef.current?.close();
	}

	function requestClose() {
		if (isDirty() && !confirm("Discard this workout?")) return;
		close();
	}

	function show(next?: SessionFormValues) {
		setModalError(undefined);
		setDraft(next);
		setFormKey((n) => n + 1);
		openAfterPaint.current = true;
	}

	return (
		<div className="mx-auto w-full max-w-6xl space-y-8 px-5 pt-4 pb-8">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-xl">Exercise Log</h1>
				<button type="button" className="min-h-11 px-3 py-2 text-sm text-blue-300 underline" onClick={() => show()}>
					Log past session
				</button>
			</div>

			<section className="space-y-3 rounded-sm bg-gray-800 p-4" aria-labelledby="start-heading">
				<h2 id="start-heading" className="font-medium">Train now</h2>
				<form method="POST" action="/workout" className="flex flex-wrap items-end gap-3">
					<input type="hidden" name="intent" value="start" />
					<label className="text-sm">Date
						<input required type="date" name="date" defaultValue={new Date().toLocaleDateString("en-CA")} className="mt-1 block min-h-11 rounded-sm bg-gray-700 p-2" />
					</label>
					<button className={btnPrimary}>Start workout</button>
				</form>
				{active.length > 0 && <div className="space-y-2">
					<h3 className="text-sm text-gray-300">In progress</h3>
					{active.map((workout) => <a key={workout.id} href={`/workout?id=${workout.id}`} className="block rounded-sm bg-gray-700 p-3 hover:bg-gray-600">
						Resume {formatSessionDate(workout.date).day} · {workout.lifts.map((lift) => lift.name).join(", ") || "No sets yet"} →
					</a>)}
				</div>}
			</section>

			{formError && !formInitial ? (
				<p className="text-sm text-yellow-400">{formError}</p>
			) : null}

			<dialog
				ref={dialogRef}
				className="hidden open:flex m-auto max-h-[90dvh] w-[calc(100%-2.5rem)] max-w-xl flex-col overflow-hidden rounded-sm bg-gray-800 p-0 text-gray-100 backdrop:bg-black/60"
				onCancel={(e) => {
					if (isDirty() && !confirm("Discard this workout?")) e.preventDefault();
				}}
				onClose={() => {
					if (location.search) history.replaceState(null, "", "/");
				}}
			>
				<h2 className="px-4 pt-4 text-base font-medium">
					{draft?.intent === "update" ? `Edit session · ${formatSessionDate(draft.date).day.replace(/^\w+, /, "")}, ${draft.date.slice(0, 4)}` : "Log session"}
				</h2>
				{modalError ? (
					<p className="px-4 pt-2 text-sm text-yellow-400">{modalError}</p>
				) : null}
				<SessionForm key={formKey} initial={draft} onCancel={requestClose} />
			</dialog>

			<section>
				<h2 className="text-base font-medium mb-3">History</h2>
				{error ? (
					<p className="text-sm text-yellow-400">{error}</p>
				) : sessions.length === 0 ? (
					<p className="text-sm text-gray-100/70">No sessions yet.</p>
				) : (
					<div className="space-y-6">
						{groups.map((group) => (
							<section key={group.month}>
								<h3 className="mb-2 text-sm text-gray-100/70">{group.month}</h3>
								<ul className="space-y-3">
									{group.sessions.map((session) => (
											<li
												key={session.id}
												id={`session-${session.id}`}
												role="button"
												tabIndex={0}
												className={`cursor-pointer rounded-sm bg-gray-700 p-3 hover:bg-gray-600 sm:flex sm:items-center sm:gap-6 ${
													session.id === savedId ? "ring-2 ring-emerald-500" : ""
												}`}
												onClick={() => show(draftFromSession(session))}
												onKeyDown={(e) => {
													if (e.key !== "Enter" && e.key !== " ") return;
													e.preventDefault();
													show(draftFromSession(session));
												}}
											>
												<span className="flex items-baseline justify-between gap-2 sm:block sm:w-36 sm:shrink-0">
													<span className="font-medium">
														{formatSessionDate(session.date).day}
													</span>
													{session.id === savedId ? (
														<span className="text-sm text-emerald-500 sm:mt-1 sm:block">
															Saved
														</span>
													) : null}
												</span>
												<div className="min-w-0 sm:flex-1">
													<ul className="mt-2 space-y-1.5 sm:mt-0 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-1 sm:space-y-0">
														{session.lifts.map((lift, i) => (
															<li key={`${session.id}-${i}`} className="text-sm">
																<span className="font-medium">{lift.name}</span>
																<span className="text-gray-100/80">
																	{" — "}
																	{lift.blocks
																		.map((b) => formatBlock(b, session.unit))
																		.join(" · ")}
																</span>
																{lift.notes ? (
																	<span className="block text-gray-100/60">
																		{lift.notes}
																	</span>
																) : null}
															</li>
														))}
													</ul>
													{session.notes ? (
														<p className="mt-2 text-sm text-gray-100/70">{session.notes}</p>
													) : null}
												</div>
											</li>
									))}
								</ul>
							</section>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
