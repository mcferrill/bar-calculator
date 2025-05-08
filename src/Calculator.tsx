import React, { useState } from 'react';
import "./index.css";

// A single plate delineated by label, size, and color.
function Plate({ plate }: { plate: number }) {
	let classes = '_plate [writing-mode:vertical-lr] mx-1 inline-block text-center rounded-sm';
	if (plate > 10) classes += ' h-20';
	if (plate < 24) classes += ' h-16 mb-2 text-sm';
	if (plate == 35) classes += ' bg-yellow-400 text-gray-900';
	if (plate == 45 || plate == 5) classes += ' bg-blue-700';
	if (plate == 25 || plate == 2.5) classes += ' bg-emerald-500';
	if (plate == 10 || plate == 1.25) classes += ' bg-white text-gray-900';
	if (plate == 1 || plate == .75 || plate == .5 || plate == .25) classes += ' bg-gray-800';
	return <p className={classes}>{plate}</p>;
}

const availablePlates = [35, 25, 10, 10, 5, 2.5, 1.25, 1, 0.75, 0.5, 0.25];

// A set of plates based on a weight and bar selection.
function Load({ weight, bar }: { weight: number, bar: number }) {
	let perSide = (weight - bar) / 2;
	let plates: number[] = [];
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

	return <div className="mb-5" key={weight}>
		<span className="block text-xl my-2 md:mt-0">
			{weight}lb ({(weight - bar) / 2}lb / side)
		</span>
		{plates?.map((plate: number) => (
			<Plate key={plate} plate={plate} />
		))}
	</div>;
}

export default function Calculator() {
	const [workWeight, setWorkWeight] = useState(320);
	const [warmupWeight, setWarmupWeight] = useState(45);
	const [bar, setBar] = useState(45);

	let sets = [<Load weight={warmupWeight} bar={bar} />];

	const range = workWeight - warmupWeight;
	for (const percent of [.33, .55, .75]) {
		let weight = warmupWeight + (range * percent);
		// Round weight to 5 pounds
		sets.push(<Load weight={weight - (weight % 5)} bar={bar} />);
	}

	sets.push(<Load weight={workWeight} bar={bar} />);

	return (
		<div className="flex-none md:flex">
			<div className="flex-none w-full md:w-1/3 md:flex-1 px-5 pt-2 h-20">
				<label className="w-1/2 block float-left pr-1">
					Work Weight
					<input className="mt-1 mb-3 w-full p-2 rounded-sm bg-gray-700" type="number" value={workWeight} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorkWeight(parseInt(e.target.value))} autoFocus={true} />
				</label>
				<label className="w-1/2 float-left block">
					Starting Warmup
					<input className="mt-1 w-full p-2 rounded-sm bg-gray-700" type="number" value={warmupWeight} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWarmupWeight(parseInt(e.target.value))} />
				</label>
			</div>
			<div className="flex-none w-full md:w-1/3 md:flex-1 px-5 pt-2">
				<label className="mb-1 rounded-sm bg-gray-700 p-2 w-full block">
					<input type="radio" name="bar" checked={bar != 33 && bar != 15} onChange={() => setBar(45)} /> Standard Bar (45#)<br />
				</label>
				<label className="mb-1 rounded-sm bg-gray-700 p-2 w-full block">
					<input type="radio" name="bar" checked={bar == 33} onChange={() => setBar(33)} /> Women's Bar (33#)<br />
				</label>
				<label className="mb-1 rounded-sm bg-gray-700 p-2 w-full block">
					<input type="radio" name="bar" checked={bar == 15} onChange={() => setBar(15)} /> Technique Bar (15#)
				</label>
			</div>
			<div className="flex-none w-full md:w-1/3 md:flex-1 px-5 pt-2">
				{sets}
			</div>
		</div>
	);
}
