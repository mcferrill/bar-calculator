export type FormatBlock = {
	sets: number;
	reps?: number;
	repsTo?: number;
	weight?: number;
	durationSec?: number;
	distanceM?: number;
};

export function formatSessionDate(iso: string): { month: string; day: string } {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) return { month: iso, day: iso };
	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	return {
		month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
		day: date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		}),
	};
}

export function formatBlock(block: FormatBlock, unit: string): string {
	const parts: string[] = [];
	if (block.repsTo != null && block.reps != null) {
		parts.push(`${block.sets}×${block.reps}–${block.repsTo}`);
	} else if (block.reps != null) {
		parts.push(`${block.sets}×${block.reps}`);
	} else {
		parts.push(`${block.sets}×`);
	}
	if (block.weight != null) {
		parts.push(`@ ${block.weight} ${unit}`);
	}
	if (block.distanceM != null) {
		const miles = block.distanceM / 1609.344;
		parts.push(
			miles >= 0.95 && miles <= 1.05
				? "1 mi"
				: `${Math.round(block.distanceM)} m`,
		);
	}
	if (block.durationSec != null) {
		const m = Math.floor(block.durationSec / 60);
		const s = block.durationSec % 60;
		parts.push(`${m}:${String(s).padStart(2, "0")}`);
	}
	return parts.join(" ");
}
