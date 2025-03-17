import React, { useState } from 'react';

function Plate({ plate }: { plate: number }) {
	let className = '_bar my-1 inline text-center rounded-sm';
	if (plate > 10) className += ' h-20';
	if (plate < 24) className += ' h-16 mb-2 text-sm';
	if (plate == 35) className += ' bg-yellow-400 text-gray-900';
	if (plate == 45 || plate == 5) className += ' bg-blue-700';
	if (plate == 25 || plate == 2.5) className += ' bg-emerald-500';
	if (plate == 10 || plate == 1.25) className += ' bg-white text-gray-900';
	if (plate == 1 || plate == .75 || plate == .5 || plate == .25) className += ' bg-gray-800';
	return <p className={className}>{plate}</p>;
}

const available_plates = [35, 25, 10, 10, 5, 2.5, 1.25, 1, 0.75, 0.5, 0.25];
function get_load(weight: number, bar: number): number[] {
	let per_side = (weight - bar) / 2;
	var load: number[] = [];
	while (per_side >= 45) {
		load.push(45);
		per_side -= 45;
	}
	for (var plate of available_plates) {
		if (per_side >= plate) {
			load.push(plate);
			per_side -= plate;
		}
	}
	return load;
}

interface Set {
	plates: number[],
	weight: number,
}

export default function Calculator() {
	const [workWeight, setWorkWeight] = useState(320);
	const [warmupWeight, setWarmupWeight] = useState(45);
	const [bar, setBar] = useState(45);

	let weights: Set[] = [{ 'plates': get_load(warmupWeight, bar), 'weight': warmupWeight }];
	const range = (workWeight / 1) - warmupWeight;

	for (const percent of [.33, .55, .75]) {
		let weight = warmupWeight + (range * percent);
		// Round weight to 5 pounds
		weight -= (weight % 5);
		weights.push({ 'plates': get_load(weight, bar), 'weight': weight });
	}

	weights.push({ 'plates': get_load(workWeight, bar), 'weight': workWeight });

	return (
		<div>
			<form id="plate_form">
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
						{weights.map((set: Set) => (
							<div className="mb-5" key={set.weight}>
								<span className="block text-xl my-2 md:mt-0">
									#{set.weight} (#{(set.weight - bar) / 2} / side)
								</span>
								{set.plates?.map((plate: number) => (
									<Plate key={plate} plate={plate} />
								))}
							</div>
						))}
					</div>
				</div>
			</form >
		</div>
	);
}
