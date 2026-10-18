import { useEffect, useState } from "react";

function Plate({ plate }: { plate: number }) {
	let classes = "_plate [writing-mode:vertical-lr] ml-1 mr-1 inline-block text-center rounded-sm";
	if (plate > 10) classes += " h-20";
	if (plate < 24) classes += " h-16 mb-2 text-sm";
	if (plate === 35) classes += " bg-yellow-400 text-gray-900";
	if (plate === 45 || plate === 5) classes += " bg-blue-700";
	if (plate === 25 || plate === 2.5) classes += " bg-emerald-500";
	if (plate === 10 || plate === 1.25) classes += " bg-white text-gray-900";
	if ([1, 0.75, 0.5, 0.25].includes(plate)) classes += " bg-gray-800";
	return <p className={classes}>{plate}</p>;
}

const availablePlates = [35, 25, 10, 10, 5, 2.5, 1.25, 1, 0.75, 0.5, 0.25];

function Load({ weight, bar }: { weight: number; bar: number }) {
	let perSide = (weight - bar) / 2;
	const plates: number[] = [];
	while (perSide >= 45) {
		plates.push(45);
		perSide -= 45;
	}
	for (const plate of availablePlates) {
		if (perSide >= plate) {
			plates.push(plate);
			perSide -= plate;
		}
	}
	return <div data-load={weight} className="space-y-2">
		<p>{weight} lb <span className="text-sm text-gray-300">({(weight - bar) / 2} lb / side)</span></p>
		{plates.length ? <div>{plates.map((plate, i) => <Plate key={i} plate={plate} />)}</div> : <p className="text-sm text-gray-300">Empty bar — no plates</p>}
		{perSide > 0 && <p className="text-sm text-yellow-300">This plate selection leaves {perSide} lb per side unloaded.</p>}
	</div>;
}

export default function Calculator({ initialWeight = 320, embedded = false }: { initialWeight?: number; embedded?: boolean }) {
	const [workWeight, setWorkWeight] = useState(initialWeight);
	const [warmupWeight, setWarmupWeight] = useState(45);
	const [bar, setBar] = useState(45);

	useEffect(() => {
		if (!embedded) return;
		const input = document.querySelector<HTMLInputElement>("#record input[name=weight]");
		const update = () => setWorkWeight(input?.value ? Number(input.value) : NaN);
		update();
		input?.addEventListener("input", update);
		return () => input?.removeEventListener("input", update);
	}, [embedded]);

	const valid = Number.isFinite(workWeight) && workWeight >= bar && workWeight <= 5000;
	const validWarmup = valid && Number.isFinite(warmupWeight) && warmupWeight >= bar && warmupWeight <= workWeight;
	const range = workWeight - warmupWeight;
	const warmups = validWarmup ? [...new Set([warmupWeight, ...[0.33, 0.55, 0.75].map((percent) => {
		const weight = warmupWeight + range * percent;
		return Math.max(warmupWeight, weight - weight % 5);
	})])].filter((weight) => weight < workWeight) : [];
	const field = "mt-1 w-full rounded-sm bg-gray-700 p-2 text-base";
	const barControl = <label className="block text-sm">Bar
		<select aria-label="Bar weight" className={field} value={bar} onChange={(event) => setBar(Number(event.target.value))}>
			<option value={45}>Standard — 45 lb</option>
			<option value={33}>Women’s — 33 lb</option>
			<option value={15}>Technique — 15 lb</option>
		</select>
	</label>;
	const warmupControl = <label className="block text-sm">Starting warmup (lb)
		<input className={field} type="number" step="any" value={Number.isFinite(warmupWeight) ? warmupWeight : ""} onChange={(event) => setWarmupWeight(event.target.valueAsNumber)} />
	</label>;
	const warmupLoads = validWarmup ? (warmups.length ? warmups.map((weight) => <Load key={weight} weight={weight} bar={bar} />) : <p className="text-sm text-gray-300">No lighter warmups needed for this weight.</p>) : <p role="status" className="text-sm text-yellow-300">Choose a starting weight between the bar and working weight.</p>;
	const load = valid ? <Load weight={workWeight} bar={bar} /> : <p role="status" className="text-sm text-gray-300">Enter a barbell weight between {bar} and 5,000 lb to see plates.</p>;

	if (embedded) return <section aria-label="Plates for this set" className="border-t border-gray-700 pt-3" onKeyDown={(event) => {
		// ponytail: calculator inputs plan only; Enter must not submit a recorded set.
		if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
	}}>
		<h3 className="mb-2 text-sm font-medium">Plates for this set</h3>
		{load}
		{barControl}
		<details>
			<summary className="min-h-11 cursor-pointer py-3 text-sm text-blue-300">Recommended warmup</summary>
			<div className="space-y-4 pb-2">
				{warmupControl}
				{warmupLoads}
			</div>
		</details>
	</section>;

	return <div className="grid items-start gap-5 px-5 py-4 md:grid-cols-3">
		<div className="space-y-3">
			<label className="block">Work weight (lb)
				<input className={field} type="number" min={bar} max="5000" step="0.5" value={Number.isFinite(workWeight) ? workWeight : ""} onChange={(event) => setWorkWeight(event.target.valueAsNumber)} autoFocus />
			</label>
			{warmupControl}
		</div>
		{barControl}
		<div className="space-y-5">{warmupLoads}{load}</div>
	</div>;
}
