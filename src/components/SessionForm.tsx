import { useState } from "react";
import type { BlockDraft, LiftDraft, SessionFormValues } from "../lib/session";

const emptyBlock = (): BlockDraft => ({
	sets: "3",
	reps: "5",
	repsTo: "",
	weight: "",
	durationSec: "",
	distanceM: "",
});

const emptyLift = (): LiftDraft => ({
	name: "",
	notes: "",
	blocks: [emptyBlock()],
});

const input =
	"rounded-sm bg-gray-700 p-2 text-base text-gray-100 border border-transparent focus:border-blue-700 outline-none";
const textButton = "min-h-11 px-1 text-sm text-blue-300";

export default function SessionForm({
	initial,
	onCancel,
}: {
	initial?: SessionFormValues;
	onCancel?: () => void;
}) {
	const today = new Date().toISOString().slice(0, 10);
	const editing = initial?.intent === "update";
	const unit = initial?.unit ?? "lb";
	const [lifts, setLifts] = useState<LiftDraft[]>(initial?.lifts ?? [emptyLift()]);

	function updateLift(i: number, patch: Partial<LiftDraft>) {
		setLifts((prev) => prev.map((lift, idx) => (idx === i ? { ...lift, ...patch } : lift)));
	}

	function updateBlock(li: number, bi: number, patch: Partial<BlockDraft>) {
		setLifts((prev) =>
			prev.map((lift, idx) =>
				idx === li
					? { ...lift, blocks: lift.blocks.map((block, j) => (j === bi ? { ...block, ...patch } : block)) }
					: lift,
			),
		);
	}

	function addBlock(li: number) {
		setLifts((prev) =>
			prev.map((lift, idx) => {
				if (idx !== li) return lift;
				const last = lift.blocks.at(-1);
				return {
					...lift,
					blocks: [...lift.blocks, { ...emptyBlock(), sets: last?.sets || "3", reps: last?.reps || "5", weight: last?.weight ?? "" }],
				};
			}),
		);
	}

	function removeRow(li: number, bi: number) {
		setLifts((prev) => {
			const lift = prev[li];
			if (!lift) return prev;
			if (lift.blocks.length > 1) {
				return prev.map((item, idx) =>
					idx === li ? { ...item, blocks: item.blocks.filter((_, j) => j !== bi) } : item,
				);
			}
			return prev.length > 1 ? prev.filter((_, idx) => idx !== li) : prev;
		});
	}

	function onKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
		if (event.key !== "Enter" || event.target instanceof HTMLTextAreaElement) return;
		event.preventDefault();
	}

	return (
		<>
			{editing && initial?.id ? (
				<form
					id="delete-session"
					method="POST"
					action="/"
					className="hidden"
					onSubmit={(event) => {
						const name = initial.lifts[0]?.name;
						if (!confirm(`Delete workout on ${name ? `${initial.date} (${name})` : initial.date}?`)) event.preventDefault();
					}}
				>
					<input type="hidden" name="intent" value="delete" />
					<input type="hidden" name="id" value={initial.id} />
				</form>
			) : null}
			<form
				method="POST"
			action="/"
				data-session-form
				className="flex min-h-0 w-full flex-1 flex-col"
				onKeyDown={onKeyDown}
				onInput={(event) => {
					event.currentTarget.dataset.dirty = "true";
				}}
				onSubmit={(event) => {
					event.currentTarget.querySelector<HTMLButtonElement>("button[name=save]")?.setAttribute("disabled", "");
				}}
			>
				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
					<input type="hidden" name="intent" value={editing ? "update" : "create"} />
					{initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
					<input type="hidden" name="liftCount" value={lifts.length} />
					<input type="hidden" name="unit" value={unit} />

					{lifts.map((lift, li) => (
						<div key={li} data-lift={li} className="space-y-1">
							<input type="hidden" name={`lift_${li}_blockCount`} value={lift.blocks.length} />
							{lift.notes ? (
								<label className="block text-sm text-gray-300">
									{lift.name || "Lift"} notes
									<input className={`${input} mt-1 w-full`} name={`lift_${li}_notes`} value={lift.notes} onChange={(event) => updateLift(li, { notes: event.target.value })} />
								</label>
							) : (
								<input type="hidden" name={`lift_${li}_notes`} value="" />
							)}
							{lift.blocks.map((block, bi) => (
								<div key={bi} className="flex items-center gap-1.5">
									{bi === 0 ? (
										<input
											aria-label="Lift"
											className={`${input} min-w-0 flex-1`}
											name={`lift_${li}_name`}
											required
											placeholder="Squat"
											value={lift.name}
											onChange={(event) => updateLift(li, { name: event.target.value })}
										/>
									) : (
										<span className="flex-1" />
									)}
									<input aria-label="Sets" className={`${input} w-[3.25rem]`} type="number" name={`lift_${li}_block_${bi}_sets`} required min="0" inputMode="numeric" value={block.sets} onChange={(event) => updateBlock(li, bi, { sets: event.target.value })} />
									<span aria-hidden="true">×</span>
									<input aria-label="Reps" className={`${input} w-[3.25rem]`} type="number" name={`lift_${li}_block_${bi}_reps`} min="0" step="any" inputMode="decimal" value={block.reps} onChange={(event) => updateBlock(li, bi, { reps: event.target.value })} />
									<span aria-hidden="true">@</span>
									<input aria-label={`Weight (${unit})`} className={`${input} w-[4.5rem]`} type="number" name={`lift_${li}_block_${bi}_weight`} min="0" step="any" inputMode="decimal" value={block.weight} onChange={(event) => updateBlock(li, bi, { weight: event.target.value })} />
									<span className="text-sm text-gray-300">{unit}</span>
									{lifts.length > 1 || lift.blocks.length > 1 ? (
										<button type="button" aria-label={`Remove ${lift.name || "set"} row ${bi + 1}`} className="min-h-11 min-w-11 text-red-300" onClick={() => removeRow(li, bi)}>×</button>
									) : null}
									<input type="hidden" name={`lift_${li}_block_${bi}_repsTo`} value={block.repsTo} readOnly />
									{block.durationSec || block.distanceM ? (
										<>
											<input aria-label="Duration (seconds)" className={`${input} w-[4.5rem]`} type="number" name={`lift_${li}_block_${bi}_durationSec`} min="1" value={block.durationSec} onChange={(event) => updateBlock(li, bi, { durationSec: event.target.value })} />
											<input aria-label="Distance (meters)" className={`${input} w-[4.5rem]`} type="number" name={`lift_${li}_block_${bi}_distanceM`} min="0.01" step="any" value={block.distanceM} onChange={(event) => updateBlock(li, bi, { distanceM: event.target.value })} />
										</>
									) : (
										<>
											<input type="hidden" name={`lift_${li}_block_${bi}_durationSec`} value={block.durationSec} readOnly />
											<input type="hidden" name={`lift_${li}_block_${bi}_distanceM`} value={block.distanceM} readOnly />
										</>
									)}
								</div>
							))}
							<button type="button" className={textButton} onClick={() => addBlock(li)}>+ Set</button>
						</div>
					))}
					<button type="button" className={textButton} onClick={() => setLifts((prev) => [...prev, emptyLift()])}>+ Lift</button>

					<details className="text-sm">
						<summary className="min-h-11 cursor-pointer py-2 text-gray-300">Date, bodyweight</summary>
						<div className="grid gap-3 pb-2 sm:grid-cols-2">
							<label>Date
								<input className={`${input} mt-1 w-full`} type="date" name="date" required defaultValue={initial?.date ?? today} />
							</label>
							<label>Bodyweight ({unit})
								<input className={`${input} mt-1 w-full`} type="number" name="bodyweight" step="any" min="0" inputMode="decimal" placeholder="optional" defaultValue={initial?.bodyweight ?? ""} />
							</label>
						</div>
					</details>

					<label className="block text-sm text-gray-300">Session notes
						<textarea className={`${input} mt-1 min-h-[4rem] w-full`} name="notes" defaultValue={initial?.notes ?? ""} />
					</label>
				</div>

				<div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-700 bg-gray-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					{editing ? (
						<button type="submit" form="delete-session" className="min-h-11 px-2 text-sm text-red-400">Delete</button>
					) : <span />}
					<div className="ml-auto flex gap-2">
						<button type="submit" name="save" className="min-h-11 rounded-sm bg-blue-700 px-4 py-2 text-sm font-medium text-gray-100">
							{editing ? "Save changes" : "Save session"}
						</button>
						{onCancel ? (
							<button type="button" className="min-h-11 px-3 text-sm text-gray-300" onClick={onCancel}>Cancel</button>
						) : null}
					</div>
				</div>
			</form>
		</>
	);
}
