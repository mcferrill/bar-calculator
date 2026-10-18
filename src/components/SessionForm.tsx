import { useEffect, useRef, useState } from "react";
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

const field =
	"mt-1 w-full p-2 rounded-sm bg-gray-700 text-gray-100 border border-transparent focus:border-blue-700 outline-none text-base";
const label = "block text-sm text-gray-100/80";
const btnSecondary =
	"min-h-11 text-sm px-3 py-2 rounded-sm bg-gray-700 hover:bg-gray-900 text-gray-100";
const btnPrimary =
	"min-h-11 px-4 py-2 rounded-sm bg-blue-700 hover:opacity-90 disabled:opacity-50 text-gray-100 text-sm font-medium";

export default function SessionForm({
	initial,
	onCancel,
}: {
	initial?: SessionFormValues;
	onCancel?: () => void;
}) {
	const today = new Date().toISOString().slice(0, 10);
	const editing = initial?.intent === "update";
	const detailsRef = useRef<HTMLDetailsElement>(null);
	const [lifts, setLifts] = useState<LiftDraft[]>(initial?.lifts ?? [emptyLift()]);

	useEffect(() => {
		if (editing && detailsRef.current) detailsRef.current.open = true;
	}, [editing]);

	function updateLift(i: number, patch: Partial<LiftDraft>) {
		setLifts((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
	}

	function updateBlock(li: number, bi: number, patch: Partial<BlockDraft>) {
		setLifts((prev) =>
			prev.map((l, idx) => {
				if (idx !== li) return l;
				return {
					...l,
					blocks: l.blocks.map((b, j) => (j === bi ? { ...b, ...patch } : b)),
				};
			}),
		);
	}

	function addBlock(li: number) {
		setLifts((prev) =>
			prev.map((l, idx) => {
				if (idx !== li) return l;
				const last = l.blocks[l.blocks.length - 1];
				return {
					...l,
					blocks: [
						...l.blocks,
						{
							...emptyBlock(),
							sets: last?.sets || "3",
							reps: last?.reps || "5",
							weight: last?.weight ?? "",
						},
					],
				};
			}),
		);
	}

	function removeBlock(li: number, bi: number) {
		setLifts((prev) =>
			prev.map((l, idx) => {
				if (idx !== li) return l;
				if (l.blocks.length <= 1) return l;
				return { ...l, blocks: l.blocks.filter((_, j) => j !== bi) };
			}),
		);
	}

	function addLift() {
		setLifts((prev) => [...prev, emptyLift()]);
	}

	function removeLift(i: number) {
		setLifts((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
		if (e.key !== "Enter") return;
		const target = e.target;
		if (!(target instanceof HTMLElement)) return;
		if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
		e.preventDefault();
		const lift = target.closest("[data-lift]");
		if (lift) addBlock(Number(lift.getAttribute("data-lift")));
	}

	return (
		<>
			{editing && initial?.id ? (
				<form
					id="delete-session"
					method="POST"
					action="/log"
					className="hidden"
					onSubmit={(e) => {
						const name = initial.lifts[0]?.name;
						const label = name ? `${initial.date} (${name})` : initial.date;
						if (!confirm(`Delete workout on ${label}?`)) e.preventDefault();
					}}
				>
					<input type="hidden" name="intent" value="delete" />
					<input type="hidden" name="id" value={initial.id} />
				</form>
			) : null}
			<form
				method="POST"
				action="/log"
				data-session-form
				className="flex min-h-0 w-full flex-1 flex-col"
				onKeyDown={onKeyDown}
				onInput={(e) => {
					e.currentTarget.dataset.dirty = "true";
				}}
				onSubmit={(e) => {
					e.currentTarget.querySelector<HTMLButtonElement>("button[name=save]")?.setAttribute(
						"disabled",
						"",
					);
				}}
			>
				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
					<input type="hidden" name="intent" value={editing ? "update" : "create"} />
					{initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
					<input type="hidden" name="liftCount" value={lifts.length} />

					{lifts.map((lift, li) => (
						<fieldset
							key={li}
							data-lift={li}
							className="rounded-sm border border-gray-700 p-3 space-y-3"
						>
							<div className="flex flex-wrap items-end gap-3">
								<label className={`${label} flex-1 min-w-[8rem]`}>
									Lift
									<input
										className={field}
										name={`lift_${li}_name`}
										required
										placeholder="Squat"
										value={lift.name}
										onChange={(e) => updateLift(li, { name: e.target.value })}
									/>
								</label>
								<label className={`${label} flex-1 min-w-[8rem]`}>
									Lift notes
									<input
										className={field}
										name={`lift_${li}_notes`}
										placeholder="optional"
										value={lift.notes}
										onChange={(e) => updateLift(li, { notes: e.target.value })}
									/>
								</label>
								{lifts.length > 1 ? (
									<button
										type="button"
										className={btnSecondary}
										onClick={() => removeLift(li)}
									>
										Remove lift
									</button>
								) : null}
							</div>

							<input
								type="hidden"
								name={`lift_${li}_blockCount`}
								value={lift.blocks.length}
							/>

							{lift.blocks.map((block, bi) => (
								<div key={bi} className="flex items-end gap-2">
									<div className="grid flex-1 grid-cols-3 gap-2">
										<label className={label}>
											Sets
											<input
												className={field}
												type="number"
												name={`lift_${li}_block_${bi}_sets`}
												required
												min="0"
												inputMode="numeric"
												value={block.sets}
												onChange={(e) =>
													updateBlock(li, bi, { sets: e.target.value })
												}
											/>
										</label>
										<label className={label}>
											Reps
											<input
												className={field}
												type="number"
												name={`lift_${li}_block_${bi}_reps`}
												min="0"
												step="any"
												inputMode="decimal"
												value={block.reps}
												onChange={(e) =>
													updateBlock(li, bi, { reps: e.target.value })
												}
											/>
										</label>
										<label className={label}>
											Weight
											<input
												className={field}
												type="number"
												name={`lift_${li}_block_${bi}_weight`}
												min="0"
												step="any"
												inputMode="decimal"
												value={block.weight}
												onChange={(e) =>
													updateBlock(li, bi, { weight: e.target.value })
												}
											/>
										</label>
									</div>
									{lift.blocks.length > 1 ? (
										<button
											type="button"
											aria-label="Remove set"
											className={`${btnSecondary} min-w-11`}
											onClick={() => removeBlock(li, bi)}
										>
											×
										</button>
									) : null}
									{/* ponytail: hidden round-trip; show inputs if these need editing */}
									<input
										type="hidden"
										name={`lift_${li}_block_${bi}_repsTo`}
										value={block.repsTo}
										readOnly
									/>
									<input
										type="hidden"
										name={`lift_${li}_block_${bi}_durationSec`}
										value={block.durationSec}
										readOnly
									/>
									<input
										type="hidden"
										name={`lift_${li}_block_${bi}_distanceM`}
										value={block.distanceM}
										readOnly
									/>
								</div>
							))}

							<button type="button" className={btnSecondary} onClick={() => addBlock(li)}>
								+ Block
							</button>
						</fieldset>
					))}

					<button type="button" className={btnSecondary} onClick={addLift}>
						+ Lift
					</button>

					<details ref={detailsRef} className="rounded-sm border border-gray-700 p-3">
						<summary className="cursor-pointer text-sm text-gray-100/80">
							Date, unit, bodyweight
						</summary>
						<div className="mt-3 grid gap-3 sm:grid-cols-3">
							<label className={label}>
								Date
								<input
									className={field}
									type="date"
									name="date"
									required
									defaultValue={initial?.date ?? today}
								/>
							</label>
							<label className={label}>
								Unit
								<select className={field} name="unit" defaultValue={initial?.unit ?? "lb"}>
									<option value="lb">lb</option>
									<option value="kg">kg</option>
								</select>
							</label>
							<label className={label}>
								Bodyweight
								<input
									className={field}
									type="number"
									name="bodyweight"
									step="any"
									min="0"
									inputMode="decimal"
									placeholder="optional"
									defaultValue={initial?.bodyweight ?? ""}
								/>
							</label>
						</div>
					</details>

					<label className={label}>
						Session notes
						<textarea
							className={`${field} min-h-[4rem]`}
							name="notes"
							placeholder="optional"
							defaultValue={initial?.notes ?? ""}
						/>
					</label>
				</div>

				<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-700 bg-gray-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					{editing ? (
						<button type="submit" form="delete-session" className="min-h-11 px-3 text-sm text-red-400">
							Delete
						</button>
					) : (
						<span />
					)}
					<div className="ml-auto flex gap-2">
						<button type="submit" name="save" className={btnPrimary}>
							{editing ? "Save changes" : "Save session"}
						</button>
						{onCancel ? (
							<button type="button" className={btnSecondary} onClick={onCancel}>
								Cancel
							</button>
						) : null}
					</div>
				</div>
			</form>
		</>
	);
}
