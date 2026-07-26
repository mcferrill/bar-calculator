import { useState } from "react";

type BlockDraft = {
	sets: string;
	reps: string;
	repsTo: string;
	weight: string;
};

type LiftDraft = {
	name: string;
	notes: string;
	blocks: BlockDraft[];
};

const emptyBlock = (): BlockDraft => ({
	sets: "3",
	reps: "5",
	repsTo: "",
	weight: "",
});

const emptyLift = (): LiftDraft => ({
	name: "",
	notes: "",
	blocks: [emptyBlock()],
});

const field =
	"mt-1 w-full p-2 rounded-sm bg-gray-700 text-gray-100 border border-transparent focus:border-blue-700 outline-none";
const label = "block text-sm text-gray-100/80";
const btnSecondary =
	"text-sm px-2 py-1 rounded-sm bg-gray-700 hover:bg-gray-900 text-gray-100";
const btnPrimary =
	"px-4 py-2 rounded-sm bg-blue-700 hover:opacity-90 text-gray-100 text-sm font-medium";

export default function SessionForm() {
	const today = new Date().toISOString().slice(0, 10);
	const [lifts, setLifts] = useState<LiftDraft[]>([emptyLift()]);

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
			prev.map((l, idx) =>
				idx === li ? { ...l, blocks: [...l.blocks, emptyBlock()] } : l,
			),
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

	return (
		<form method="POST" className="space-y-4">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<label className={label}>
					Date
					<input className={field} type="date" name="date" required defaultValue={today} />
				</label>
				<label className={label}>
					Unit
					<select className={field} name="unit" defaultValue="lb">
						<option value="lb">lb</option>
						<option value="kg">kg</option>
					</select>
				</label>
				<label className={`${label} col-span-2 sm:col-span-1`}>
					Bodyweight
					<input
						className={field}
						type="number"
						name="bodyweight"
						step="any"
						min="0"
						placeholder="optional"
					/>
				</label>
			</div>

			<input type="hidden" name="liftCount" value={lifts.length} />

			{lifts.map((lift, li) => (
				<fieldset
					key={li}
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
						<div
							key={bi}
							className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end"
						>
							<label className={label}>
								Sets
								<input
									className={field}
									type="number"
									name={`lift_${li}_block_${bi}_sets`}
									required
									min="0"
									value={block.sets}
									onChange={(e) => updateBlock(li, bi, { sets: e.target.value })}
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
									value={block.reps}
									onChange={(e) => updateBlock(li, bi, { reps: e.target.value })}
								/>
							</label>
							<label className={label}>
								Reps to
								<input
									className={field}
									type="number"
									name={`lift_${li}_block_${bi}_repsTo`}
									min="0"
									step="any"
									placeholder="range"
									value={block.repsTo}
									onChange={(e) =>
										updateBlock(li, bi, { repsTo: e.target.value })
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
									value={block.weight}
									onChange={(e) =>
										updateBlock(li, bi, { weight: e.target.value })
									}
								/>
							</label>
							{lift.blocks.length > 1 ? (
								<button
									type="button"
									className={`${btnSecondary} mb-0.5`}
									onClick={() => removeBlock(li, bi)}
								>
									Remove
								</button>
							) : (
								<span />
							)}
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

			<label className={label}>
				Session notes
				<textarea
					className={`${field} min-h-[4rem]`}
					name="notes"
					placeholder="optional"
				/>
			</label>

			<button type="submit" className={btnPrimary}>
				Save session
			</button>
		</form>
	);
}
